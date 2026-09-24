import { describe, expect, it } from "bun:test";
import { Chunk, Effect, Stream } from "effect";
import { cloudflareAdapter } from "../../../src/adapters/sandbox/cloudflare";
import type { ExecChunk } from "../../../src/ports/sandbox";
import { hasCloudflare } from "../../fixtures/credentials";

const SANDBOX_ID = /^[a-z2-7]+$/;
const WORKSPACE = "/tmp/anpord-bridge";

const collect = (stream: Stream.Stream<ExecChunk, unknown>) =>
  Stream.runCollect(stream).pipe(Effect.map(Chunk.toReadonlyArray));

const outputOf = (chunks: readonly ExecChunk[]) =>
  chunks
    .flatMap((chunk) => (chunk.stream === "exit" ? [] : [chunk.data]))
    .join("");

describe.skipIf(!hasCloudflare)("the Cloudflare bridge worker", () => {
  it("mints an id a later attach can reach the same sandbox by", async () => {
    const { id, reattached } = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const adapter = yield* cloudflareAdapter();

          const sandbox = yield* Effect.acquireRelease(
            adapter.open({
              autoStopMinutes: 5,
              provider: "cloudflare",
              workspace: WORKSPACE,
            }),
            (handle) => Effect.ignore(adapter.destroy(handle))
          );

          yield* sandbox.writeFile(
            `${WORKSPACE}/left-behind.txt`,
            "still here"
          );

          const attached = yield* adapter.attach(sandbox.id);

          return {
            id: sandbox.id,
            reattached: outputOf(
              yield* collect(
                attached.exec("cat left-behind.txt", { cwd: WORKSPACE })
              )
            ),
          };
        })
      )
    );

    expect(id).toMatch(SANDBOX_ID);
    expect(reattached).toContain("still here");
  }, 180_000);
});
