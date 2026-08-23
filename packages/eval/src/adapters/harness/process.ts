import { Effect, Option, Stream } from "effect";
import type { HarnessName } from "../../domain/cell";
import { HarnessUnavailable } from "../../domain/errors";
import type { ExecChunk, SandboxHandle } from "../../ports/sandbox";

const TRAILING_RETURN = /\r$/;

const MAX_STDERR = 8192;

interface Line {
  readonly _tag: "line";
  readonly at: number;
  readonly line: string;
}

interface Exit {
  readonly _tag: "exit";
  readonly exitCode: number;
  readonly stderr: string;
}

type Output = Line | Exit;

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
): readonly [Frame, readonly Output[]] => {
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
        (line): Line => ({ _tag: "line", at: state.at, line })
      ),
      { _tag: "exit", exitCode: chunk.exitCode, stderr: state.stderr },
    ],
  ];
};

export const shellQuote = (value: string) =>
  `'${value.replaceAll("'", `'\\''`)}'`;

export const harnessLines = (
  harness: HarnessName,
  sandbox: SandboxHandle,
  command: string,
  env: Readonly<Record<string, string>>
) =>
  sandbox.exec(command, { env, timeoutMs: 15 * 60 * 1000 }).pipe(
    Stream.mapError(
      (cause) => new HarnessUnavailable({ harness, reason: cause.reason })
    ),
    Stream.mapAccum({ at: 0, stderr: "", stdout: "" } satisfies Frame, frame),
    Stream.mapConcat((outputs) => outputs),
    Stream.mapEffect((output) => {
      if (output._tag === "line") {
        return Effect.succeed(output);
      }

      if (output.exitCode === 0) {
        return Effect.succeed(null);
      }

      return Effect.fail(
        new HarnessUnavailable({
          harness,
          reason:
            output.stderr.trim() ||
            `Harness exited with status ${output.exitCode}`,
        })
      );
    }),
    Stream.filterMap(Option.fromNullable)
  );
