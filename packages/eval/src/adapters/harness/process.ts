import { Duration, Effect, Option, Stream } from "effect";
import { HarnessUnavailable } from "../../domain/errors";
import type { HarnessName } from "../../domain/variant";
import type { ExecChunk, SandboxHandle } from "../../ports/sandbox";

const TRAILING_RETURN = /\r$/;

const MAX_STDERR = 8192;

const TIMEOUT = Duration.minutes(15);

export interface HarnessLine {
  readonly _tag: "line";
  readonly at: number;
  readonly line: string;
}

export interface HarnessExit {
  readonly _tag: "exit";
  readonly at: number;
  readonly exitCode: number;
  readonly stderr: string;
}

export type HarnessOutput = HarnessLine | HarnessExit;

export type ExecLine =
  | HarnessLine
  | { readonly _tag: "stderr"; readonly data: string }
  | { readonly _tag: "exit"; readonly at: number; readonly exitCode: number };

interface Pending {
  readonly at: number;
  readonly stdout: string;
}

export const shellQuote = (value: string) =>
  `'${value.replaceAll("'", `'\\''`)}'`;

const split = (value: string, final: boolean) => {
  const lines: string[] = [];
  let from = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === "\n") {
      const end = index > from && value[index - 1] === "\r" ? index - 1 : index;
      lines.push(value.slice(from, end));
      from = index + 1;
    } else if (
      character === "\r" &&
      index + 1 < value.length &&
      value[index + 1] !== "\n"
    ) {
      lines.push(value.slice(from, index));
      from = index + 1;
    }
  }

  if (final && from < value.length) {
    lines.push(value.slice(from).replace(TRAILING_RETURN, ""));
    return { lines, pending: "" };
  }

  return { lines, pending: value.slice(from) };
};

const lineAt =
  (at: number) =>
  (line: string): HarnessLine => ({ _tag: "line", at, line });

const framed = (
  state: Pending,
  chunk: ExecChunk
): readonly [Pending, readonly ExecLine[]] => {
  if (chunk.stream === "stderr") {
    return [state, [{ _tag: "stderr", data: chunk.data }]];
  }

  if (chunk.stream === "stdout") {
    const next = split(`${state.stdout}${chunk.data}`, false);
    return [
      { at: chunk.at, stdout: next.pending },
      next.lines.map(lineAt(chunk.at)),
    ];
  }

  const final = split(state.stdout, true);
  return [
    { ...state, stdout: "" },
    [
      ...final.lines.map(lineAt(state.at)),
      { _tag: "exit", at: chunk.at, exitCode: chunk.exitCode },
    ],
  ];
};

export const execLines = <E, R>(chunks: Stream.Stream<ExecChunk, E, R>) =>
  chunks.pipe(
    Stream.mapAccum({ at: 0, stdout: "" } satisfies Pending, framed),
    Stream.mapConcat((lines) => lines)
  );

const withStderr = (
  stderr: string,
  output: ExecLine
): readonly [string, readonly HarnessOutput[]] => {
  switch (output._tag) {
    case "line":
      return [stderr, [output]];
    case "stderr":
      return [`${stderr}${output.data}`.slice(-MAX_STDERR), []];
    default:
      return [stderr, [{ ...output, stderr }]];
  }
};

const framedOutput = (
  harness: HarnessName,
  sandbox: SandboxHandle,
  command: string,
  env: Readonly<Record<string, string>>
) =>
  execLines(
    sandbox.exec(command, { env, timeoutMs: Duration.toMillis(TIMEOUT) })
  ).pipe(
    Stream.mapError(
      (cause) => new HarnessUnavailable({ harness, reason: cause.reason })
    ),
    Stream.mapAccum("", withStderr),
    Stream.mapConcat((outputs) => outputs)
  );

const linesOnly = (harness: HarnessName) =>
  Stream.mapEffect((output: HarnessOutput) => {
    if (output._tag === "line") {
      return Effect.succeed(Option.some(output));
    }

    return output.exitCode === 0
      ? Effect.succeed(Option.none<HarnessLine>())
      : Effect.fail(
          new HarnessUnavailable({
            harness,
            reason:
              output.stderr.trim() ||
              `Harness exited with status ${output.exitCode}`,
          })
        );
  });

export function harnessLines(
  harness: HarnessName,
  sandbox: SandboxHandle,
  command: string,
  env: Readonly<Record<string, string>>
): Stream.Stream<HarnessLine, HarnessUnavailable>;
export function harnessLines(
  harness: HarnessName,
  sandbox: SandboxHandle,
  command: string,
  env: Readonly<Record<string, string>>,
  options: { readonly exit: "report" }
): Stream.Stream<HarnessOutput, HarnessUnavailable>;
export function harnessLines(
  harness: HarnessName,
  sandbox: SandboxHandle,
  command: string,
  env: Readonly<Record<string, string>>,
  options: { readonly exit: "fail" | "report" } = { exit: "fail" }
): Stream.Stream<HarnessOutput, HarnessUnavailable> {
  const output = framedOutput(harness, sandbox, command, env);

  return options.exit === "report"
    ? output
    : output.pipe(
        linesOnly(harness),
        Stream.filterMap((line) => line)
      );
}
