const RUN_PREFIX = /^run_/;

/**
 * A run id short enough to sit in a column.
 *
 * The prefix says nothing a reader does not already know from the page they
 * are on, and six characters of a ULID are enough to tell one run from another
 * in a list of twenty.
 */
export const shortId = (id: string) => id.replace(RUN_PREFIX, "").slice(0, 6);
