const UNIQUE_VIOLATION = "23505";

const MAX_DEPTH = 5;

const codeOf = (value: unknown) =>
  typeof value === "object" && value !== null && "code" in value
    ? (value as { code?: unknown }).code
    : undefined;

/* Drizzle wraps the driver's error, so the constraint code is never on the
   error a caller first sees. */
export const isUniqueViolation = (cause: unknown) => {
  let current = cause;

  for (let depth = 0; depth < MAX_DEPTH; depth += 1) {
    if (codeOf(current) === UNIQUE_VIOLATION) {
      return true;
    }

    if (typeof current !== "object" || current === null) {
      return false;
    }

    current = (current as { cause?: unknown }).cause;
  }

  return false;
};
