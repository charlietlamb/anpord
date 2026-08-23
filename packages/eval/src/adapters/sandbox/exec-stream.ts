import { Chunk, Clock, Effect, Option, Stream } from "effect";
import type { SandboxUnavailable } from "../../domain/errors";
import type { ExecChunk } from "../../ports/sandbox";

type BeforeStamping<T> = T extends unknown ? Omit<T, "at"> : never;

interface ExecSink {
  readonly stderr: (data: string) => void;
  readonly stdout: (data: string) => void;
}

export type StartCommand = (
  sink: ExecSink
) => Effect.Effect<number, SandboxUnavailable>;

export const execStream = (
  start: StartCommand
): Stream.Stream<ExecChunk, SandboxUnavailable> =>
  Stream.unwrap(
    Clock.clockWith((clock) =>
      Effect.succeed(
        Stream.asyncScoped<ExecChunk, SandboxUnavailable>((emit) => {
          const stampAndEmit = (chunk: BeforeStamping<ExecChunk>) => {
            emit(
              Effect.succeed(
                Chunk.of({
                  ...chunk,
                  at: clock.unsafeCurrentTimeMillis(),
                } as ExecChunk)
              )
            );
          };

          const sink: ExecSink = {
            stderr: (data) => stampAndEmit({ data, stream: "stderr" }),
            stdout: (data) => stampAndEmit({ data, stream: "stdout" }),
          };

          return start(sink).pipe(
            Effect.match({
              onFailure: (cause) => {
                emit(Effect.fail(Option.some(cause)));
              },
              onSuccess: (exitCode) => {
                stampAndEmit({ exitCode, stream: "exit" });
                emit(Effect.fail(Option.none()));
              },
            }),
            Effect.forkScoped,
            Effect.asVoid
          );
        })
      )
    )
  );
