import { Effect, Option, Stream } from "effect";
import type { HarnessName } from "../../domain/cell";
import { HarnessUnavailable } from "../../domain/errors";
import type { ExecChunk, SandboxHandle } from "../../ports/sandbox";

const TRAILING_RETURN = /\r$/;

const MAX_STDERR = 8192;

const TIMEOUT_MS = 15 * 60 * 1000;

export interface HarnessLine {
  readonly _tag: "line";
  readonly at: number;
  readonly line: string;
}

/** How the process ended, with the stderr tail that usually says why. */
export interface HarnessExit {
  readonly _tag: "exit";
  readonly at: number;
  readonly exitCode: number;
  readonly stderr: string;
}

export type HarnessOutput = HarnessLine | HarnessExit;

export interface HarnessLinesOptions {
  /* "fail" ends the stream with HarnessUnavailable on a non-zero exit, which
     is what every stock harness wants. "report" keeps every line and closes
     with the exit itself, for a driver that records how a process ended
     rather than discarding what it printed first. */
  readonly exit: "fail" | "report";
}

interface Frame {
  readonly at: number;
  readonly stderr: string;
  readonly stdout: string;
}

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

const frame = (
  state: Frame,
  chunk: ExecChunk
): readonly [Frame, readonly HarnessOutput[]] => {
  if (chunk.stream === "stderr") {
    return [
      { ...state, stderr: `${state.stderr}${chunk.data}`.slice(-MAX_STDERR) },
      [],
    ];
  }

  if (chunk.stream === "stdout") {
    const next = split(`${state.stdout}${chunk.data}`, false);
    return [
      { ...state, at: chunk.at, stdout: next.pending },
      next.lines.map((line) => ({ _tag: "line", at: chunk.at, line })),
    ];
  }

  const final = split(state.stdout, true);
  return [
    { ...state, stdout: "" },
    [
      ...final.lines.map(
        (line): HarnessLine => ({ _tag: "line", at: state.at, line })
      ),
      {
        _tag: "exit",
        at: chunk.at,
        exitCode: chunk.exitCode,
        stderr: state.stderr,
      },
    ],
  ];
};

export const shellQuote = (value: string) =>
  `'${value.replaceAll("'", `'\\''`)}'`;

const framedOutput = (
  harness: HarnessName,
  sandbox: SandboxHandle,
  command: string,
  env: Readonly<Record<string, string>>
) =>
  sandbox.exec(command, { env, timeoutMs: TIMEOUT_MS }).pipe(
    Stream.mapError(
      (cause) => new HarnessUnavailable({ harness, reason: cause.reason })
    ),
    Stream.mapAccum({ at: 0, stderr: "", stdout: "" } satisfies Frame, frame),
    Stream.mapConcat((outputs) => outputs)
  );

const failedExit = (harness: HarnessName, exit: HarnessExit) =>
  new HarnessUnavailable({
    harness,
    reason: exit.stderr.trim() || `Harness exited with status ${exit.exitCode}`,
  });

const linesOnly = (harness: HarnessName) =>
  Stream.mapEffect((output: HarnessOutput) => {
    if (output._tag === "line") {
      return Effect.succeed(Option.some(output));
    }

    return output.exitCode === 0
      ? Effect.succeed(Option.none<HarnessLine>())
      : Effect.fail(failedExit(harness, output));
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
  options: HarnessLinesOptions = { exit: "fail" }
): Stream.Stream<HarnessOutput, HarnessUnavailable> {
  const output = framedOutput(harness, sandbox, command, env);

  return options.exit === "report"
    ? output
    : output.pipe(
        linesOnly(harness),
        Stream.filterMap((line) => line)
      );
}
