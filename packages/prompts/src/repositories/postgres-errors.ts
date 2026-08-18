const UNIQUE_VIOLATION = "23505";

/** How far to follow a cause chain before giving up. The driver wraps the
 * error it was given, and a wrapper of a wrapper is still the same failure. */
const MAX_DEPTH = 5;

const codeOf = (value: unknown) =>
  typeof value === "object" && value !== null && "code" in value
    ? (value as { code?: unknown }).code
    : undefined;

/**
 * Drizzle raises its own error carrying the driver's underneath, so the code
 * that names the constraint is never on the error a caller first sees. Reading
 * only the top meant a version written concurrently looked like an unknown
 * store failure, and the retry that exists to absorb it never ran.
 */
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
