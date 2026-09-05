import { Schema } from "effect";

/**
 * How long a string a trial may carry to the sandbox.
 *
 * Every one of these is `shellQuote`d into a single command line and handed to
 * `sh -c` as one argv element, and Linux caps one argument at `MAX_ARG_STRLEN`
 * -- 128 KiB. Past that the trial dies as an opaque `E2BIG` inside a VM that
 * is already billing, which reads as a broken provider rather than as a
 * request nobody should have accepted.
 *
 * The budget is in characters against a byte ceiling, so it holds for text
 * that is not ASCII: 128 KiB is 32768 characters even where every one of them
 * costs the four bytes UTF-8 allows. The prompt takes half of that and the
 * verifier a quarter, leaving the rest for the harness's own flags, the
 * workspace path, the model name, the profile arguments, and the escaping
 * `shellQuote` adds -- which turns each apostrophe into four characters.
 *
 * These are ceilings on what the wire accepts, not targets. The prompts people
 * actually send are hundreds of characters and the longest verifier stored is
 * under three thousand.
 */
const PROMPT_LIMIT = 16_384;

const VERIFY_LIMIT = 8192;

/* A name is read in a table cell and a cell key, never executed, so it is
   bounded to what a column can show rather than to what a shell can take. */
const NAME_LIMIT = 200;

/* A variable's value is substituted into the prompt before it is quoted, so
   the values together must not be able to exceed the prompt's own budget.
   Eight of the longest still fit. */
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
