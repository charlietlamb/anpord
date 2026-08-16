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
