import { formatDate } from "@anpord/ui/lib/format-date";
import { differenceInCalendarDays, formatDistanceStrict } from "date-fns";

const RECENT_DAYS = 7;

/** The caller passes the clock, so a render stays pure and server and client
 * agree on what "now" was. */
export function relativeTime(value: Date | string, now: Date) {
  const at = new Date(value);

  return Math.abs(differenceInCalendarDays(now, at)) < RECENT_DAYS
    ? formatDistanceStrict(at, now, { addSuffix: true })
    : formatDate(at);
}

/** `8 hours` to `8h`: the unit word down to its first letter. */
const ABBREVIATED = /^(\d+)\s(\w)\w*$/;

/** `8h`, not `8 hours ago`. date-fns picks the unit, so the thresholds match
 * every other elapsed time in the app. */
export function shortAge(value: Date | string, now: Date) {
  const spelled = formatDistanceStrict(new Date(value), now);

  return spelled.replace(ABBREVIATED, "$1$2");
}
