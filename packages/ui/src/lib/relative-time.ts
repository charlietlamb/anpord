import { formatDate } from "@anpord/ui/lib/format-date";
import { differenceInCalendarDays, formatDistanceStrict } from "date-fns";

const RECENT_DAYS = 7;

/**
 * Recent edits read better as elapsed time; older ones as a date. The caller
 * passes the clock rather than the formatter reading it, so a render stays pure
 * and the server and client agree on what "now" was.
 */
export function relativeTime(value: Date | string, now: Date) {
  const at = new Date(value);

  return Math.abs(differenceInCalendarDays(now, at)) < RECENT_DAYS
    ? formatDistanceStrict(at, now, { addSuffix: true })
    : formatDate(at);
}

/** `8 hours` to `8h`: the unit word down to its first letter, which is what
 * makes the figure narrow enough to repeat on every row. */
const ABBREVIATED = /^(\d+)\s(\w)\w*$/;

/**
 * The same age in a column's worth of characters: `8h`, not `8 hours ago`.
 *
 * A list repeats this figure on every row, where the words are identical down
 * the whole column and only the number varies. The full moment belongs in a
 * tooltip, which is where {@link relativeTime} still reads well.
 *
 * date-fns chooses the unit, so the thresholds between minutes, hours and days
 * are the ones every other elapsed time in the app already uses.
 */
export function shortAge(value: Date | string, now: Date) {
  const spelled = formatDistanceStrict(new Date(value), now);

  return spelled.replace(ABBREVIATED, "$1$2");
}
