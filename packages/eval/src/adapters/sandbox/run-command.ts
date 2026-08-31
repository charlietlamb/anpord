import { Chunk, Duration, Effect, Stream } from "effect";
import { SandboxUnavailable } from "../../domain/errors";
import type {
  ExecChunk,
  ExecOptions,
  SandboxHandle,
} from "../../ports/sandbox";

export interface CommandOutcome {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

export type CommandWatcher = (
  output: string
) => Effect.Effect<void, never, never>;

const OUTPUT_LIMIT = 8000;

/** The tail, because a command explains itself at the end: the error it
 * stopped on, not the banner it started with. */
export const lastOf = (output: string) => output.slice(-OUTPUT_LIMIT);
const WATCH_BATCH = 64;
const WATCH_WINDOW = Duration.seconds(2);

const textOf = (chunks: Chunk.Chunk<ExecChunk>) =>
  Chunk.toReadonlyArray(chunks)
    .flatMap((chunk) => (chunk.stream === "exit" ? [] : [chunk.data]))
    .join("");

const watched = (
  output: Stream.Stream<ExecChunk, SandboxUnavailable>,
  watch: CommandWatcher | undefined
) =>
  watch === undefined
    ? output
    : output.pipe(
        Stream.groupedWithin(WATCH_BATCH, WATCH_WINDOW),
        Stream.tap((batch) => Effect.ignoreLogged(watch(textOf(batch)))),
        Stream.flattenChunks
      );

export const runCommandForOutcome = (
  sandbox: SandboxHandle,
  command: string,
  options?: ExecOptions & { readonly watch?: CommandWatcher }
): Effect.Effect<CommandOutcome, SandboxUnavailable> =>
  watched(sandbox.exec(command, options), options?.watch).pipe(
    Stream.runFold(
      { exitCode: 1, stderr: "", stdout: "" },
      (outcome, chunk) => {
        if (chunk.stream === "exit") {
          return { ...outcome, exitCode: chunk.exitCode };
        }

        const appended = lastOf(`${outcome[chunk.stream]}${chunk.data}`);

        return { ...outcome, [chunk.stream]: appended };
      }
    )
  );

export const runCommandOrFail = <E>(
  sandbox: SandboxHandle,
  command: string,
  onFailure: (outcome: CommandOutcome) => E,
  options?: ExecOptions & { readonly watch?: CommandWatcher }
): Effect.Effect<void, E | SandboxUnavailable> =>
  runCommandForOutcome(sandbox, command, options).pipe(
    Effect.flatMap((outcome) =>
      outcome.exitCode === 0 ? Effect.void : Effect.fail(onFailure(outcome))
    )
  );

export const runCommand = (
  sandbox: SandboxHandle,
  command: string,
  options?: ExecOptions
) =>
  runCommandOrFail(
    sandbox,
    command,
    (outcome) =>
      new SandboxUnavailable({
        provider: sandbox.provider,
        reason: `Command exited with status ${outcome.exitCode}`,
      }),
    options
  );
