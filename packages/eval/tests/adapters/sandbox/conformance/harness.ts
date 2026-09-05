import { Chunk, Effect, Stream } from "effect";
import type {
  ExecChunk,
  SandboxAdapterShape,
  SandboxHandle,
} from "../../../../src/ports/sandbox";

export const WORKSPACE = "/tmp/anpord-conformance";

export const collect = (stream: Stream.Stream<ExecChunk, unknown>) =>
  Stream.runCollect(stream).pipe(Effect.map(Chunk.toReadonlyArray));

export const outputOf = (chunks: readonly ExecChunk[]) =>
  chunks
    .flatMap((chunk) => (chunk.stream === "exit" ? [] : [chunk.data]))
    .join("");

export const streamOf = (
  chunks: readonly ExecChunk[],
  stream: "stdout" | "stderr"
) =>
  chunks
    .flatMap((chunk) => (chunk.stream === stream ? [chunk.data] : []))
    .join("");

export const exitOf = (chunks: readonly ExecChunk[]) =>
  chunks.findLast((chunk) => chunk.stream === "exit")?.exitCode ?? null;

/**
 * One sandbox, destroyed however the assertions end.
 *
 * Acquired and released rather than opened and closed, so a failing assertion
 * still gives the sandbox back: a suite that leaks one per failure costs real
 * money on every provider here.
 */
export const withSandbox = <A, E>(
  adapter: Effect.Effect<SandboxAdapterShape>,
  use: (
    sandbox: SandboxHandle,
    adapter: SandboxAdapterShape
  ) => Effect.Effect<A, E>,
  cache?: string
) =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const resolved = yield* adapter;

        const sandbox = yield* Effect.acquireRelease(
          resolved.open({
            autoStopMinutes: 5,
            cache,
            provider: resolved.provider,
            workspace: WORKSPACE,
          }),
          (handle) => Effect.ignore(resolved.destroy(handle))
        );

        return yield* use(sandbox, resolved);
      })
    ) as Effect.Effect<A>
  );
