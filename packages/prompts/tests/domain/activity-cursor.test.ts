import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import {
  activityCursorFor,
  decodeActivityCursor,
  encodeActivityCursor,
} from "../../src/domain/activity-cursor";
import type { PromptEventRow } from "../../src/repositories/prompt-event-repository";

const row = (at: Date, internalId: string): PromptEventRow => ({
  actor: null,
  at,
  channel: "production",
  from: 1,
  internalId,
  kind: "deployed",
  message: null,
  promptId: "greeting",
  version: 2,
});

const decode = (encoded: string) =>
  Effect.runPromise(decodeActivityCursor(encoded));

describe("activityCursorFor", () => {
  /** The column has no zone and the driver parses it as local, so the stored
   * wall clock is recovered by reading the Date back in UTC. Reading it in
   * local time instead shifts the cursor by the offset, and every page then
   * repeats rows the previous one already returned. */
  test("recovers the wall clock the column holds", () => {
    const at = new Date("2026-08-16T22:49:34.754Z");

    const cursor = activityCursorFor(row(at, "pev_1"));

    expect(cursor.at).toBe("2026-08-16 22:49:34.754");
  });

  test("keeps a fixed width so the comparison stays lexical", () => {
    const at = new Date("2026-01-02T03:04:05.006Z");

    expect(activityCursorFor(row(at, "pev_1")).at).toBe(
      "2026-01-02 03:04:05.006"
    );
  });

  test("survives a round trip", async () => {
    const at = new Date("2026-08-16T22:49:34.754Z");
    const cursor = activityCursorFor(row(at, "pev_1"));

    const decoded = await decode(encodeActivityCursor(cursor));

    expect(decoded).toEqual(cursor);
  });
});

describe("decodeActivityCursor", () => {
  test("refuses a cursor that is not base64", async () => {
    const result = await Effect.runPromise(
      decodeActivityCursor("not a cursor").pipe(Effect.either)
    );

    expect(result._tag).toBe("Left");
  });

  test("refuses a cursor missing the id that breaks ties", async () => {
    const encoded = encodeActivityCursor({
      at: "2026-08-16 22:49:34.754",
    } as never);

    const result = await Effect.runPromise(
      decodeActivityCursor(encoded).pipe(Effect.either)
    );

    expect(result._tag).toBe("Left");
  });
});
