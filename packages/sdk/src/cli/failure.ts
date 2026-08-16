import { Effect } from "effect";
import { asAnpordError } from "../client/errors";

const MISSING_KEY =
  "Set ANPORD_API_KEY to an API key from https://www.anpord.com/settings/keys";

const describe = (error: unknown) => {
  if ((error as { readonly _tag?: unknown })._tag === "ConfigError") {
    return MISSING_KEY;
  }
  const { message, status } = asAnpordError(error);
  return status === 401 ? `${message}. ${MISSING_KEY}` : message;
};

export const reportFailure = (error: unknown) =>
  Effect.sync(() => {
    process.stderr.write(`${describe(error)}\n`);
    process.exitCode = 1;
  });
