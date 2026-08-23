import { describe, expect, it } from "bun:test";
import { Box } from "@upstash/box";
import { Chunk, Effect, Stream } from "effect";
import { makeUpstashAdapter } from "../../../src/adapters/sandbox/upstash";
import type { ExecChunk } from "../../../src/ports/sandbox";
import { hasUpstash } from "../../fixtures/credentials";

const collect = (stream: Stream.Stream<ExecChunk, unknown>) =>
  Stream.runCollect(stream).pipe(Effect.map(Chunk.toReadonlyArray));

const outputOf = (chunks: readonly ExecChunk[]) =>
  chunks
    .flatMap((chunk) => (chunk.stream === "exit" ? [] : [chunk.data]))
    .join("");

const exitOf = (chunks: readonly ExecChunk[]) =>
  chunks.findLast((chunk) => chunk.stream === "exit")?.exitCode ?? null;

describe.skipIf(!hasUpstash)("the Upstash Box adapter", () => {
  it("supports files, cwd, env, failures, and reattachment", async () => {
    const id = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const adapter = yield* makeUpstashAdapter;
          const sandbox = yield* Effect.acquireRelease(
            adapter.open({
              autoStopMinutes: 5,
              provider: "upstash",
              workspace: "/tmp/anpord-live",
            }),
            (handle) => Effect.orDie(adapter.destroy(handle))
          );

          yield* sandbox.writeFile(
            "/tmp/anpord-live/nested/value.txt",
            "box-ready"
          );

          const success = yield* collect(
            sandbox.exec('printf "$ANPORD_WANTED:"; cat nested/value.txt', {
              cwd: "/tmp/anpord-live",
              env: { ANPORD_WANTED: "visible" },
            })
          );
          const failure = yield* collect(
            sandbox.exec("echo expected-failure; exit 7")
          );
          const attached = yield* adapter.attach(sandbox.id);
          const reattached = yield* collect(
            attached.exec("pwd", { cwd: "/tmp/anpord-live" })
          );
          const isolated = yield* collect(
            sandbox.exec('test -z "$UPSTASH_BOX_API_KEY"')
          );

          expect(outputOf(success)).toContain("visible:box-ready");
          expect(exitOf(success)).toBe(0);
          expect(outputOf(failure)).toContain("expected-failure");
          expect(exitOf(failure)).toBe(7);
          expect(outputOf(reattached)).toContain("/tmp/anpord-live");
          expect(exitOf(isolated)).toBe(0);

          return sandbox.id;
        })
      )
    );

    expect((await Box.list()).some((box) => box.id === id)).toBe(false);
  }, 120_000);

  it("cancels a command that exceeds its deadline", async () => {
    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const adapter = yield* makeUpstashAdapter;
          const sandbox = yield* Effect.acquireRelease(
            adapter.open({
              autoStopMinutes: 5,
              provider: "upstash",
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

    expect(result._tag).toBe("Right");
    expect(result._tag === "Right" ? exitOf(result.right) : 0).not.toBe(0);
  }, 120_000);
});
