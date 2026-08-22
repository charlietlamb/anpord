/**
 * How this app writes a length of time.
 *
 * One module because three components had each defined `seconds` and two had
 * defined `durationOf`, and the copies disagreed: a 340ms command read as
 * `0.3s` in the trial table and `340ms` in the chart beside it. Sub-second
 * precision is the rule, because a command that took 130ms and one that took
 * 900ms are not the same event and `0.1s` against `0.9s` hides that.
 */
export const seconds = (ms: number) =>
  ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;

/** A whole run, which lasts minutes rather than milliseconds and is read for
 * its magnitude rather than its precision. */
export const elapsed = (startedAt: number, finishedAt: number | null) => {
  if (finishedAt === null) {
    return null;
  }

  const total = Math.round((finishedAt - startedAt) / 1000);

  return total < 60 ? `${total}s` : `${Math.round(total / 60)}m`;
};

/** A moment on a clock: the day and the time it happened. */
export const clock = (millis: number) =>
  new Date(millis).toLocaleString(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });

/** A moment on a calendar, for a list where the day is what separates one
 * entry from the next. */
export const dayOf = (millis: number) =>
  new Date(millis).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

/** A count with thousands separated, so 272717 reads as a quantity rather
 * than a serial number. */
export const count = (value: number) => value.toLocaleString();

/** Stands in for a number that does not exist, so a column keeps its shape
 * rather than collapsing where a trial produced nothing. */
export const NOTHING = "·";
