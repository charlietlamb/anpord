import { Option } from "effect";
import type { RunHarness } from "../../ports/harness";
import { shellQuote } from "./process";

const SPHYNX_DIR = ".sphynx";

export const recorderPath = (home: string) => `${home}/${SPHYNX_DIR}/trace.sh`;

const UNSAFE_IN_NAME = /[^A-Za-z0-9_-]+/g;

export const tracePath = (sandbox: {
  readonly home: string;
  readonly id: string;
}) =>
  `${sandbox.home}/${SPHYNX_DIR}/trace-${sandbox.id.replace(UNSAFE_IN_NAME, "-")}.ndjson`;

const assignment = (name: string, value: string) =>
  `${name}=${shellQuote(value)}`;

export const commandCommand = (request: RunHarness, run: string) => {
  const home = request.sandbox.home;

  const variables = [
    assignment("SPHYNX_PROMPT", request.prompt),
    assignment("SPHYNX_MODEL", request.model),
    assignment("SPHYNX_HOME", home),
    assignment("SPHYNX_WORKSPACE", request.workspace),
    ...Option.match(request.systemPromptPath, {
      onNone: () => [],
      onSome: (path) => [assignment("SPHYNX_SYSTEM_PROMPT_FILE", path)],
    }),
    assignment("SPHYNX_TRACE_LOG", tracePath(request.sandbox)),
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
