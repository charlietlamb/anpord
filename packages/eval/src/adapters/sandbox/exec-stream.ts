import { Chunk, Effect, Option, Stream } from "effect";
import type { SandboxUnavailable } from "../../domain/errors";
import type { ExecChunk } from "../../ports/sandbox";

/* A bare Omit over a union collapses it to the one key the members share. */
type BeforeStamping<T> = T extends unknown ? Omit<T, "at"> : never;

export interface ExecSink {
  readonly stderr: (data: string) => void;
  readonly stdout: (data: string) => void;
}

export type StartCommand = (
  sink: ExecSink
) => Effect.Effect<number, SandboxUnavailable>;

/**
 * Runs a command, stamping every chunk at the moment the provider hands it
 * over.
 *
 * The single place timing is decided, so no adapter reads a clock and none
 * can get it wrong. Stamping anywhere later measures when the transport chose
 * to deliver rather than when the work happened: reading it in the harness
 * reported zero for a five second command on a provider that answered in one
 * piece.
 */
export const execStream = (
  start: StartCommand
): Stream.Stream<ExecChunk, SandboxUnavailable> =>
  Stream.asyncScoped<ExecChunk, SandboxUnavailable>((emit) => {
    /* Not Clock: the sink is called from vendor callbacks with no fiber to
       read one from. Confined here, which keeps the rest of the package
       free of it. */
    const stampAndEmit = (chunk: BeforeStamping<ExecChunk>) => {
      emit(Effect.succeed(Chunk.of({ ...chunk, at: Date.now() } as ExecChunk)));
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
  });
