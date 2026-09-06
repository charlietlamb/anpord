import { Schema } from "effect";

/* All of these are shell-quoted into one `sh -c` argv element, which Linux caps at MAX_ARG_STRLEN (128 KiB, or 32768 four-byte characters); the prompt takes half of that budget and the verifier a quarter, leaving room for flags, paths and quoting. */
const PROMPT_LIMIT = 16_384;

const VERIFY_LIMIT = 8192;

/* Read in a table cell and a cell key, never executed, so bounded by display rather than by the shell. */
const NAME_LIMIT = 200;

/* Substituted into the prompt before quoting, so eight of the longest still fit its budget. */
const VARIABLE_VALUE_LIMIT = 2048;

export const EvalPrompt = Schema.String.pipe(
  Schema.maxLength(PROMPT_LIMIT),
  Schema.annotations({
    description: "What the agent is asked to do.",
    identifier: "EvalPrompt",
    message: () =>
      `A prompt must be at most ${PROMPT_LIMIT} characters, because it is quoted into one sandbox command line.`,
  })
);

export const EvalVerify = Schema.String.pipe(
  Schema.maxLength(VERIFY_LIMIT),
  Schema.annotations({
    description: "The shell command that decides whether a trial passed.",
    identifier: "EvalVerify",
    message: () =>
      `A verifier must be at most ${VERIFY_LIMIT} characters, because it is quoted into one sandbox command line.`,
  })
);

export const EvalCaseName = Schema.String.pipe(
  Schema.maxLength(NAME_LIMIT),
  Schema.annotations({
    description: "What a case is called.",
    identifier: "EvalCaseName",
    message: () => `A case name must be at most ${NAME_LIMIT} characters.`,
  })
);

export const EvalVariableValue = Schema.String.pipe(
  Schema.maxLength(VARIABLE_VALUE_LIMIT),
  Schema.annotations({
    identifier: "EvalVariableValue",
    message: () =>
      `A variable value must be at most ${VARIABLE_VALUE_LIMIT} characters, because it is substituted into the prompt before it is quoted.`,
  })
);
