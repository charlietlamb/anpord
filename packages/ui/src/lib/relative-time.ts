import { formatDate } from "@anpord/ui/lib/format-date";
import { differenceInCalendarDays, formatDistanceStrict } from "date-fns";

const RECENT_DAYS = 7;

export function relativeTime(value: Date | string, now: Date) {
  const at = new Date(value);

  return Math.abs(differenceInCalendarDays(now, at)) < RECENT_DAYS
    ? formatDistanceStrict(at, now, { addSuffix: true })
    : formatDate(at);
}

const ABBREVIATED = /^(\d+)\s(\w)\w*$/;

export function shortAge(value: Date | string, now: Date) {
  const spelled = formatDistanceStrict(new Date(value), now);

  return spelled.replace(ABBREVIATED, "$1$2");
}
