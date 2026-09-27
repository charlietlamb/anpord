import { Schema } from "effect";
import type { PromptEventRow } from "../repositories/prompt-event-repository";

/* The id breaks ties: the clock reads milliseconds while the column keeps
   microseconds, so two events can share an `at`. */
export const ActivityCursorPayload = Schema.Struct({
  /* The column's wall-clock string, not epoch millis: `created_at` has no
     zone, so a round trip through an instant shifts it by the offset. */
  at: Schema.String,
  id: Schema.String,
});
export type ActivityCursorPayload = typeof ActivityCursorPayload.Type;

/* The driver parses the zoneless `created_at` as local, so reading the Date
   back in UTC undoes that shift and recovers the stored wall clock. */
const wallClock = (value: Date) =>
  value.toISOString().replace("T", " ").replace("Z", "");

export const activityCursorFor = (
  row: PromptEventRow
): ActivityCursorPayload => ({
  at: wallClock(row.at),
  id: row.internalId,
});
