const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const ABSOLUTE = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
});

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function relativeTime(value: Date, now: number) {
  const at = value instanceof Date ? value : new Date(value);
  const elapsed = now - at.getTime();

  if (elapsed < HOUR) {
    return RELATIVE.format(
      -Math.max(1, Math.floor(elapsed / MINUTE)),
      "minute"
    );
  }
  if (elapsed < DAY) {
    return RELATIVE.format(-Math.floor(elapsed / HOUR), "hour");
  }
  if (elapsed < WEEK) {
    return RELATIVE.format(-Math.floor(elapsed / DAY), "day");
  }
  return ABSOLUTE.format(at);
}
