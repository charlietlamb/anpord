import { Option } from "effect";
import type { RunHarness } from "../../ports/harness";
import { shellQuote } from "./process";

const ANPORD_DIR = ".anpord";

export const recorderPath = (home: string) => `${home}/${ANPORD_DIR}/trace.sh`;

export const tracePath = (home: string) => `${home}/${ANPORD_DIR}/trace.ndjson`;

const assignment = (name: string, value: string) =>
  `${name}=${shellQuote(value)}`;

/**
 * What the customer's process is started as.
 *
 * `bash -c` rather than the run string spliced into the outer shell, so the
 * recorder's DEBUG trap is armed for it: BASH_ENV is read only by a bash that
 * starts non-interactively. Stdin is closed because a process that blocks on
 * it would hold the trial open to the fifteen-minute cap.
 */
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
    assignment("ANPORD_TRACE_LOG", tracePath(home)),
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
