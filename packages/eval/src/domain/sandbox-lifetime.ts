import { DEFAULT_TIMEOUT_MS } from "@anpord/schema/domain/eval-limits";
import { Duration } from "effect";

const AUTO_STOP = Duration.minutes(15);

export const autoStopMinutesFor = (timeoutMs: number | null) => {
  const extra = Math.max(
    0,
    (timeoutMs ?? DEFAULT_TIMEOUT_MS) - DEFAULT_TIMEOUT_MS
  );
  return Math.ceil(
    Duration.toMinutes(Duration.sum(AUTO_STOP, Duration.millis(extra)))
  );
};
