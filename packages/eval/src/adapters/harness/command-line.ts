import { Option } from "effect";
import type { RunHarness } from "../../ports/harness";
import { shellQuote } from "./process";

const ANPORD_DIR = ".anpord";

export const recorderPath = (home: string) => `${home}/${ANPORD_DIR}/trace.sh`;

const UNSAFE_IN_NAME = /[^A-Za-z0-9_-]+/g;

export const tracePath = (sandbox: {
  readonly home: string;
  readonly id: string;
}) =>
  `${sandbox.home}/${ANPORD_DIR}/trace-${sandbox.id.replace(UNSAFE_IN_NAME, "-")}.ndjson`;

const assignment = (name: string, value: string) =>
  `${name}=${shellQuote(value)}`;

export const commandCommand = (request: RunHarness, run: string) => {
  const home = request.sandbox.home;

  const variables = [
    assignment("ANPORD_PROMPT", request.prompt),
    assignment("ANPORD_MODEL", request.model),
    assignment("ANPORD_HOME", home),
    assignment("ANPORD_WORKSPACE", request.workspace),
    ...Option.match(request.systemPromptPath, {
      onNone: () => [],
      onSome: (path) => [assignment("ANPORD_SYSTEM_PROMPT_FILE", path)],
    }),
    assignment("ANPORD_TRACE_LOG", tracePath(request.sandbox)),
    assignment("BASH_ENV", recorderPath(home)),
  ];

  return [
    `cd ${shellQuote(request.workspace)}`,
    "&&",
    ...variables,
    `bash -c ${shellQuote(run)}`,
    "< /dev/null",
  ].join(" ");
};
