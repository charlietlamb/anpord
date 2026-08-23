import { Cause } from "effect";

/* Long enough for a provider to explain itself, short enough that a list row
   stays a row. Anything past this is a stack, and a stack belongs in the log
   rather than on a screen. */
const LIMIT = 240;

const firstLine = (text: string) => {
  const line = text.split("\n").find((each) => each.trim() !== "") ?? "";

  return line.length > LIMIT ? `${line.slice(0, LIMIT).trimEnd()}…` : line;
};

/**
 * Why a run stopped, in a sentence.
 *
 * `String(cause)` prints the wrapper and its whole stack -- a thousand
 * characters of absolute paths for a failure whose meaning is one line, spread
 * across a list where every row is one line high. The tagged errors carry a
 * `reason` written for a person, so it is read out rather than reconstructed
 * from the text around it.
 */
export const failureOf = (cause: Cause.Cause<unknown>): string => {
  const error = Cause.failureOption(cause);

  if (error._tag === "Some") {
    const held = error.value;

    if (typeof held === "object" && held !== null && "reason" in held) {
      return firstLine(String(held.reason));
    }

    /* An error that says what happened is worth more than the stack around
       it. Store failures carry no `reason` and used to fall through to the
       pretty cause, which recorded a screenful of paths for a run whose real
       problem was one sentence. */
    if (held instanceof Error && held.message !== "") {
      return firstLine(held.message);
    }
  }

  return firstLine(Cause.pretty(cause));
};
