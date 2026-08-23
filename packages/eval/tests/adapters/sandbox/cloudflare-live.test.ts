import { describe, expect, it } from "bun:test";
import { Chunk, Effect, Stream } from "effect";
import { makeCloudflareAdapter } from "../../../src/adapters/sandbox/cloudflare";
import type { ExecChunk } from "../../../src/ports/sandbox";
import { hasCloudflare } from "../../fixtures/credentials";

const SANDBOX_ID = /^[a-z2-7]+$/;

const collect = (stream: Stream.Stream<ExecChunk, unknown>) =>
  Stream.runCollect(stream).pipe(Effect.map(Chunk.toReadonlyArray));

const outputOf = (chunks: readonly ExecChunk[]) =>
  chunks
    .flatMap((chunk) => (chunk.stream === "exit" ? [] : [chunk.data]))
    .join("");

const exitOf = (chunks: readonly ExecChunk[]) =>
  chunks.findLast((chunk) => chunk.stream === "exit")?.exitCode ?? null;

describe.skipIf(!hasCloudflare)("the Cloudflare adapter", () => {
  it("supports files, cwd, env, failures, isolation, and reattachment", async () => {
    const id = await Effect.runPromise(
      Effect.gen(function* () {
        const adapter = yield* makeCloudflareAdapter;
        const id = yield* Effect.scoped(
          Effect.gen(function* () {
            const sandbox = yield* Effect.acquireRelease(
              adapter.open({
                autoStopMinutes: 5,
                provider: "cloudflare",
                workspace: "/tmp/anpord-live",
              }),
              (handle) => Effect.orDie(adapter.destroy(handle))
            );

            yield* sandbox.writeFile(
              "/tmp/anpord-live/nested/value.txt",
              "cloudflare-ready"
            );

            const success = yield* collect(
              sandbox.exec(
                'printf "$ANPORD_WANTED:"; cat nested/value.txt; printf "\\n"; git --version',
                {
                  cwd: "/tmp/anpord-live",
                  env: { ANPORD_WANTED: "visible" },
                }
              )
            );
            const failure = yield* collect(
              sandbox.exec("echo expected-failure; exit 7")
            );
            const attached = yield* adapter.attach(sandbox.id);
            const reattached = yield* collect(
              attached.exec("pwd", { cwd: "/tmp/anpord-live" })
            );
            const isolated = yield* collect(
              sandbox.exec(
                'test -z "$CLOUDFLARE_API_TOKEN" && test -z "$CLOUDFLARE_SANDBOX_API_KEY"'
              )
            );

            expect(outputOf(success)).toContain("visible:cloudflare-ready");
            expect(outputOf(success)).toContain("git version");
            expect(exitOf(success)).toBe(0);
            expect(outputOf(failure)).toContain("expected-failure");
            expect(exitOf(failure)).toBe(7);
            expect(outputOf(reattached)).toContain("/tmp/anpord-live");
            expect(exitOf(isolated)).toBe(0);

            return sandbox.id;
          })
        );
        return id;
      })
    );

    expect(id).toMatch(SANDBOX_ID);
  }, 180_000);

  it("stops a command that exceeds its deadline", async () => {
    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const adapter = yield* makeCloudflareAdapter;
          const sandbox = yield* Effect.acquireRelease(
            adapter.open({
              autoStopMinutes: 5,
              provider: "cloudflare",
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
