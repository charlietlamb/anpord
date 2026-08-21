import { Effect, ParseResult, Schema } from "effect";
import type { DeploymentRow } from "../repositories/deployment-repository";
import { InvalidCursor } from "./errors";

/**
 * Where the last page stopped: a timestamp and the row that carried it.
 *
 * The id is not decoration. Two channels moved in the same millisecond share a
 * `deployedAt` — the clock behind it reads milliseconds while the column keeps
 * microseconds — and a cursor that carries only the timestamp cannot say which
 * of them was already read. Paging on the pair leaves no room for that
 * ambiguity.
 */
export const DeploymentCursorPayload = Schema.Struct({
  /** Carried as the wall-clock string the column holds rather than as epoch
   * millis. `created_at` is a timestamp without a zone, so turning it into an
   * instant and back shifts it by the offset and the cursor stops landing on
   * the row it came from. */
  deployedAt: Schema.String,
  id: Schema.String,
});
export type DeploymentCursorPayload = typeof DeploymentCursorPayload.Type;

const decodePayload = Schema.decodeUnknown(DeploymentCursorPayload);

const toBase64Url = (value: string) =>
  btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

const fromBase64Url = (value: string) =>
  atob(value.replaceAll("-", "+").replaceAll("_", "/"));

export const encodeDeploymentCursor = (
  cursor: DeploymentCursorPayload
): string => toBase64Url(JSON.stringify(cursor));

/** `created_at` has no zone, and the driver parses it as if it were local, so
 * the Date it hands back is offset from the value the column actually holds.
 * Reading it back in UTC undoes exactly that shift and recovers the stored
 * wall clock, which is what the comparison has to be made against. */
const wallClock = (value: Date) =>
  value.toISOString().replace("T", " ").replace("Z", "");

export const deploymentCursorFor = (
  row: DeploymentRow
): DeploymentCursorPayload => ({
  deployedAt: wallClock(row.deployedAt),
  id: row.internalId,
});

/** Decoded through the schema rather than cast, so a tampered cursor is
 * rejected here instead of reaching the query as an arbitrary id. */
export const decodeDeploymentCursor = (
  encoded: string
): Effect.Effect<DeploymentCursorPayload, InvalidCursor> =>
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
