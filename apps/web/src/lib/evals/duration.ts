import { formatDuration } from "date-fns/formatDuration";
import { intervalToDuration } from "date-fns/intervalToDuration";
export const seconds = (ms: number) =>
  ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;

export const elapsed = (startedAt: number, finishedAt: number | null) => {
  if (finishedAt === null) {
    return null;
  }

  const total = Math.round((finishedAt - startedAt) / 1000);

  return total < 60 ? `${total}s` : `${Math.round(total / 60)}m`;
};

/* `elapsed` rounds 363 minutes to `363m`, which hides that it is six hours. */
export const exactly = (startedAt: number, finishedAt: number | null) => {
  if (finishedAt === null) {
    return "an unknown time";
  }

  const spelled = formatDuration(
    intervalToDuration({ end: finishedAt, start: startedAt }),
    { format: ["hours", "minutes", "seconds"] }
  );

  /* formatDuration answers an empty string when every field is zero. */
  return spelled === "" ? "less than a second" : spelled;
};

export const clock = (millis: number) =>
  new Date(millis).toLocaleString(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });

export const count = (value: number) => value.toLocaleString();

export const NOTHING = "·";
