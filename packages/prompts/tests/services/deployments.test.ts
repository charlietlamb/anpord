import { describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import {
  DeploymentRepository,
  type DeploymentRepositoryShape,
  type DeploymentRow,
} from "../../src/repositories/deployment-repository";
import { Deployments, DeploymentsLive } from "../../src/services/deployments";
import { actor } from "../fixtures/prompt-rows";

const at = new Date("2026-01-01T00:00:00.000Z");

const row = (
  internalId: string,
  fromVersion: number | null,
  toVersion: number
): DeploymentRow => ({
  channel: "production",
  deployedAt: at,
  deployedBy: { image: null, name: "Charlie Lamb" },
  fromVersion,
  internalId,
  promptId: "greeting",
  promptName: "Greeting",
  toVersion,
});

const serving = (rows: readonly DeploymentRow[]) =>
  Layer.succeed(DeploymentRepository, {
    list: () => Effect.succeed(rows),
  } satisfies DeploymentRepositoryShape);

const listWith = (rows: readonly DeploymentRow[]) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const deployments = yield* Deployments;
      return yield* deployments.list(actor, {});
    }).pipe(Effect.provide(DeploymentsLive.pipe(Layer.provide(serving(rows)))))
  );

describe("Deployments", () => {
  test("names a move with no previous version a first deploy", async () => {
    const [deployment] = await listWith([row("chev_1", null, 1)]);

    expect(deployment?.kind).toBe("first");
    expect(deployment?.fromVersion).toBeNull();
  });

  test("names a move to a higher version a promotion", async () => {
    const [deployment] = await listWith([row("chev_1", 4, 5)]);

    expect(deployment?.kind).toBe("promotion");
  });

  test("names a move to a lower version a rollback", async () => {
    const [deployment] = await listWith([row("chev_1", 7, 5)]);

    expect(deployment?.kind).toBe("rollback");
  });

  /** Three of the twenty-three rows in production are this shape. Calling them
   * promotions would say something changed for callers when nothing did. */
  test("names a move to the serving version a repeat", async () => {
    const [deployment] = await listWith([row("chev_1", 6, 6)]);

    expect(deployment?.kind).toBe("repeat");
  });

  test("keeps the order the repository returned", async () => {
    const deployments = await listWith([
      row("chev_3", 2, 3),
      row("chev_2", 1, 2),
      row("chev_1", null, 1),
    ]);

    expect(deployments.map((deployment) => deployment.id)).toEqual([
      "chev_3",
      "chev_2",
      "chev_1",
    ]);
  });

  /** The rows come from SQL, so a column that changes shape has to surface as
   * a failure rather than reaching a caller as a decoded value. */
  test("fails rather than serving a row the schema rejects", async () => {
    const invalid = { ...row("chev_1", null, 0), toVersion: -1 };

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const deployments = yield* Deployments;
        return yield* deployments.list(actor, {});
      }).pipe(
        Effect.provide(DeploymentsLive.pipe(Layer.provide(serving([invalid])))),
        Effect.either
      )
    );

    expect(result._tag).toBe("Left");
  });
});
