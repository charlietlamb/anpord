import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import {
  decodeDeploymentCursor,
  deploymentCursorFor,
  encodeDeploymentCursor,
} from "../../src/domain/deployment-cursor";
import type { DeploymentRow } from "../../src/repositories/deployment-repository";

const row = (deployedAt: Date, internalId: string): DeploymentRow => ({
  channel: "production",
  deployedAt,
  deployedBy: null,
  fromVersion: 1,
  internalId,
  promptId: "greeting",
  promptName: "Greeting",
  toVersion: 2,
});

const decode = (encoded: string) =>
  Effect.runPromise(decodeDeploymentCursor(encoded));

describe("deploymentCursorFor", () => {
  /** The column has no zone and the driver parses it as local, so the stored
   * wall clock is recovered by reading the Date back in UTC. Reading it in
   * local time instead shifts the cursor by the offset, and every page then
   * repeats rows the previous one already returned. */
  test("recovers the wall clock the column holds", () => {
    const at = new Date("2026-08-16T22:49:34.754Z");

    const cursor = deploymentCursorFor(row(at, "chev_1"));

    expect(cursor.deployedAt).toBe("2026-08-16 22:49:34.754");
  });

  test("keeps a fixed width so the comparison stays lexical", () => {
    const at = new Date("2026-01-02T03:04:05.006Z");

    expect(deploymentCursorFor(row(at, "chev_1")).deployedAt).toBe(
      "2026-01-02 03:04:05.006"
    );
  });

  test("survives a round trip", async () => {
    const at = new Date("2026-08-16T22:49:34.754Z");
    const cursor = deploymentCursorFor(row(at, "chev_1"));

    const decoded = await decode(encodeDeploymentCursor(cursor));

    expect(decoded).toEqual(cursor);
  });
});

describe("decodeDeploymentCursor", () => {
  test("refuses a cursor that is not base64", async () => {
    const result = await Effect.runPromise(
      decodeDeploymentCursor("not a cursor").pipe(Effect.either)
    );

    expect(result._tag).toBe("Left");
  });

  test("refuses a cursor missing the id that breaks ties", async () => {
    const encoded = encodeDeploymentCursor({
      deployedAt: "2026-08-16 22:49:34.754",
    } as never);

    const result = await Effect.runPromise(
      decodeDeploymentCursor(encoded).pipe(Effect.either)
    );

    expect(result._tag).toBe("Left");
  });
});
