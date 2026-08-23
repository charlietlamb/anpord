import { describe, expect, it } from "bun:test";
import { Chunk, Effect, Stream } from "effect";
import { makeVercelAdapter } from "../../../src/adapters/sandbox/vercel";
import type { ExecChunk } from "../../../src/ports/sandbox";
import { hasVercel } from "../../fixtures/credentials";

const collect = (stream: Stream.Stream<ExecChunk, unknown>) =>
  Stream.runCollect(stream).pipe(Effect.map(Chunk.toReadonlyArray));

const outputOf = (chunks: readonly ExecChunk[]) =>
  chunks
    .flatMap((chunk) => (chunk.stream === "exit" ? [] : [chunk.data]))
    .join("");

const exitOf = (chunks: readonly ExecChunk[]) =>
  chunks.findLast((chunk) => chunk.stream === "exit")?.exitCode ?? null;

describe.skipIf(!hasVercel)("the Vercel adapter", () => {
  it("supports files, cwd, env, failures, isolation, and reattachment", async () => {
    const id = await Effect.runPromise(
      Effect.gen(function* () {
        const adapter = yield* makeVercelAdapter;
        return yield* Effect.scoped(
          Effect.gen(function* () {
            const sandbox = yield* Effect.acquireRelease(
              adapter.open({
                autoStopMinutes: 5,
                provider: "vercel",
                workspace: "/tmp/anpord-live",
              }),
              (handle) => Effect.orDie(adapter.destroy(handle))
            );

            yield* sandbox.writeFile(
              "/tmp/anpord-live/nested/value.txt",
              "vercel-ready"
            );

            const success = yield* collect(
              sandbox.exec(
                'printf "$ANPORD_WANTED:"; cat nested/value.txt; printf "\\nHOME=$HOME\\n"; git --version',
                {
                  cwd: "/tmp/anpord-live",
                  env: { ANPORD_WANTED: "visible" },
                }
              )
            );
            const failure = yield* collect(
              sandbox.exec("echo expected-failure >&2; exit 7")
            );
            const attached = yield* adapter.attach(sandbox.id);
            const reattached = yield* collect(
              attached.exec("pwd", { cwd: "/tmp/anpord-live" })
            );
            const isolated = yield* collect(
              sandbox.exec(
                'test -z "$VERCEL_OIDC_TOKEN" && test -z "$VERCEL_TOKEN"'
              )
            );

            expect(outputOf(success)).toContain("visible:vercel-ready");
            expect(outputOf(success)).toContain("HOME=/vercel");
            expect(outputOf(success)).toContain("git version");
            expect(exitOf(success)).toBe(0);
            expect(outputOf(failure)).toContain("expected-failure");
            expect(exitOf(failure)).toBe(7);
            expect(outputOf(reattached)).toContain("/tmp/anpord-live");
            expect(exitOf(isolated)).toBe(0);
            expect(sandbox.home).toBe("/vercel");

            return sandbox.id;
          })
        );
      })
    );

    expect(id.length).toBeGreaterThan(0);
  }, 180_000);

  it("kills a command that exceeds its deadline", async () => {
    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const adapter = yield* makeVercelAdapter;
          const sandbox = yield* Effect.acquireRelease(
            adapter.open({
              autoStopMinutes: 5,
              provider: "vercel",
              workspace: "/tmp/anpord-timeout",
            }),
            (handle) => Effect.orDie(adapter.destroy(handle))
          );

          return yield* collect(
            sandbox.exec("sleep 30", { timeoutMs: 300 })
          ).pipe(Effect.either);
        })
      )
    );

    if (result._tag === "Right") {
      expect(exitOf(result.right)).not.toBe(0);
    } else {
      expect(result.left).toBeDefined();
    }
  }, 180_000);
});
