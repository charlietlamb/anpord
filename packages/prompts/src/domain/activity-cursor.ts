import { Effect, ParseResult, Schema } from "effect";
import type { PromptEventRow } from "../repositories/prompt-event-repository";
import { InvalidCursor } from "./errors";

/* The id breaks ties: the clock reads milliseconds while the column keeps
   microseconds, so two events can share an `at`. */
export const ActivityCursorPayload = Schema.Struct({
  /* The column's wall-clock string, not epoch millis: `created_at` has no
     zone, so a round trip through an instant shifts it by the offset. */
  at: Schema.String,
  id: Schema.String,
});
export type ActivityCursorPayload = typeof ActivityCursorPayload.Type;

const decodePayload = Schema.decodeUnknown(ActivityCursorPayload);

const toBase64Url = (value: string) =>
  btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

const fromBase64Url = (value: string) =>
  atob(value.replaceAll("-", "+").replaceAll("_", "/"));

export const encodeActivityCursor = (cursor: ActivityCursorPayload): string =>
  toBase64Url(JSON.stringify(cursor));

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

/* Decoded, not cast, so a tampered cursor is rejected before it reaches the
   query as an arbitrary id. */
export const decodeActivityCursor = (
  encoded: string
): Effect.Effect<ActivityCursorPayload, InvalidCursor> =>
  Effect.suspend(() =>
    Effect.try({
      try: () => JSON.parse(fromBase64Url(encoded)) as unknown,
      catch: () => new InvalidCursor({ cursor: encoded }),
    })
  ).pipe(
    Effect.flatMap(decodePayload),
    Effect.catchIf(
      ParseResult.isParseError,
      () => new InvalidCursor({ cursor: encoded })
    )
  );
