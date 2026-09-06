import { Cause } from "effect";

const LIMIT = 240;

const firstLine = (text: string) => {
  const line = text.split("\n").find((each) => each.trim() !== "") ?? "";

  return line.length > LIMIT ? `${line.slice(0, LIMIT).trimEnd()}…` : line;
};

/* `String(cause)` prints the whole stack, so a tagged error's own `reason` is
   read out instead. */
export const failureOf = (cause: Cause.Cause<unknown>): string => {
  const error = Cause.failureOption(cause);

  if (error._tag === "Some") {
    const held = error.value;

    if (typeof held === "object" && held !== null && "reason" in held) {
      return firstLine(String(held.reason));
    }

    /* Store failures carry no `reason`, and their message beats the pretty cause. */
    if (held instanceof Error && held.message !== "") {
      return firstLine(held.message);
    }
  }

  return firstLine(Cause.pretty(cause));
};
