import { WEB_ORIGIN } from "@sphynx/schema/public/origins";
import { Effect } from "effect";
import { asSphynxError } from "../client/errors";

const MISSING_KEY = `Set SPHYNX_API_KEY to an API key from ${WEB_ORIGIN}/settings/keys`;

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
  const { message, status } = asSphynxError(error);
  return status === 401 ? `${message}. ${MISSING_KEY}` : message;
};

const exitCodeOf = (error: unknown) =>
  tagOf(error) === "EvalGateFailed" ? EXIT_GATE_FAILED : EXIT_ERROR;

export const reportFailure = (error: unknown) =>
  Effect.sync(() => {
    process.stderr.write(`${describe(error)}\n`);
    process.exitCode = exitCodeOf(error);
  });
