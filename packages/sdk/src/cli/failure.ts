import { Effect } from "effect";
import { asAnpordError } from "../client/errors";

const MISSING_KEY =
  "Set ANPORD_API_KEY to an API key from https://www.anpord.com/settings/keys";

export const EXIT_ERROR = 1;
const EXIT_GATE_FAILED = 2;
export const EXIT_INTERRUPTED = 130;

const tagOf = (error: unknown) =>
  typeof error === "object" && error !== null && "_tag" in error
    ? error._tag
    : undefined;

const describe = (error: unknown) => {
  if (tagOf(error) === "ConfigError") {
    return MISSING_KEY;
  }
  const { message, status } = asAnpordError(error);
  return status === 401 ? `${message}. ${MISSING_KEY}` : message;
};

const exitCodeOf = (error: unknown) =>
  tagOf(error) === "EvalGateFailed" ? EXIT_GATE_FAILED : EXIT_ERROR;

export const reportFailure = (error: unknown) =>
  Effect.sync(() => {
    process.stderr.write(`${describe(error)}\n`);
    process.exitCode = exitCodeOf(error);
  });
