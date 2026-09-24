import { Effect, Stream } from "effect";
import type { SandboxUnavailable } from "../../domain/errors";
import type { ExecChunk } from "../../ports/sandbox";

export interface ExecSink {
  readonly stderr: (data: string) => void;
  readonly stdout: (data: string) => void;
}

export const execStream = (
  start: (sink: ExecSink) => Effect.Effect<number, SandboxUnavailable>
): Stream.Stream<ExecChunk, SandboxUnavailable> =>
  Stream.asyncScoped<ExecChunk, SandboxUnavailable>((emit) =>
    Effect.clockWith((clock) => {
      const at = () => clock.unsafeCurrentTimeMillis();
      const sink: ExecSink = {
        stderr: (data) => emit.single({ at: at(), data, stream: "stderr" }),
        stdout: (data) => emit.single({ at: at(), data, stream: "stdout" }),
      };

      return start(sink).pipe(
        Effect.match({
          onFailure: (cause) => emit.fail(cause),
          onSuccess: (exitCode) => {
            emit.single({ at: at(), exitCode, stream: "exit" });
            emit.end();
          },
        }),
        Effect.forkScoped,
        Effect.asVoid
      );
    })
  );
