const UNIQUE_VIOLATION = "23505";

export const isUniqueViolation = (cause: unknown) =>
  typeof cause === "object" &&
  cause !== null &&
  "code" in cause &&
  (cause as { code?: string }).code === UNIQUE_VIOLATION;
