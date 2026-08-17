import { describe, expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import {
  DeploymentRepository,
  type DeploymentRepositoryShape,
  type DeploymentRow,
} from "../../src/repositories/deployment-repository";
import type { DeploymentQuery } from "../../src/services/deployments";
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

/** Records what the service asked for, so the paging arithmetic can be checked
 * rather than inferred from the rows that come back. */
const recording = (rows: readonly DeploymentRow[]) => {
  const asked: { limit?: number } = {};

  const layer = Layer.succeed(DeploymentRepository, {
    list: (_org, params) => {
      asked.limit = params.limit;
      return Effect.succeed(rows.slice(0, params.limit));
    },
  } satisfies DeploymentRepositoryShape);

  return { asked, layer };
};

const listWith = (
  rows: readonly DeploymentRow[],
  query: Partial<DeploymentQuery> = {}
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const deployments = yield* Deployments;
      return yield* deployments.list(actor, { limit: 25, ...query });
    }).pipe(
      Effect.provide(DeploymentsLive.pipe(Layer.provide(recording(rows).layer)))
    )
  );

describe("Deployments", () => {
  test("names a move with no previous version a first deploy", async () => {
    const page = await listWith([row("chev_1", null, 1)]);

    expect(page.items[0]?.kind).toBe("first");
    expect(page.items[0]?.fromVersion).toBeNull();
  });

  test("names a move to a higher version a promotion", async () => {
    const page = await listWith([row("chev_1", 4, 5)]);

    expect(page.items[0]?.kind).toBe("promotion");
  });

  test("names a move to a lower version a rollback", async () => {
    const page = await listWith([row("chev_1", 7, 5)]);

    expect(page.items[0]?.kind).toBe("rollback");
  });

  /** Three of the twenty-three rows in production are this shape. Calling them
   * promotions would say something changed for callers when nothing did. */
  test("names a move to the serving version a repeat", async () => {
    const page = await listWith([row("chev_1", 6, 6)]);

    expect(page.items[0]?.kind).toBe("repeat");
  });

  /** A user can be deleted while the deployment they made stays. The row keeps
   * its shape and arrives with nulls, which is nobody rather than a person
   * with no name. */
  test("serves a deployment whose author has been deleted", async () => {
    const orphaned: DeploymentRow = {
      ...row("chev_1", 1, 2),
      deployedBy: { image: null, name: null },
    };

    const page = await listWith([orphaned]);

    expect(page.items[0]?.deployedBy).toBeNull();
  });

  test("keeps the order the repository returned", async () => {
    const page = await listWith([
      row("chev_3", 2, 3),
      row("chev_2", 1, 2),
      row("chev_1", null, 1),
    ]);

    expect(page.items.map((deployment) => deployment.id)).toEqual([
      "chev_3",
      "chev_2",
      "chev_1",
    ]);
  });

  test("asks for one more row than the caller wanted", async () => {
    const { asked, layer } = recording([row("chev_1", null, 1)]);

    await Effect.runPromise(
      Effect.gen(function* () {
        const deployments = yield* Deployments;
        return yield* deployments.list(actor, { limit: 10 });
      }).pipe(Effect.provide(DeploymentsLive.pipe(Layer.provide(layer))))
    );

    expect(asked.limit).toBe(11);
  });

  /** The extra row is the only honest signal that a page is not the last one:
   * a full page and a final page are the same length. */
  test("offers a cursor only when a further row exists", async () => {
    const three = [
      row("chev_3", 2, 3),
      row("chev_2", 1, 2),
      row("chev_1", null, 1),
    ];

    const full = await listWith(three, { limit: 2 });
    expect(full.items).toHaveLength(2);
    expect(full.nextCursor).not.toBeNull();

    const last = await listWith(three, { limit: 3 });
    expect(last.items).toHaveLength(3);
    expect(last.nextCursor).toBeNull();
  });

  test("refuses a cursor it did not issue", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const deployments = yield* Deployments;
        return yield* deployments.list(actor, {
          cursor: "not-a-real-cursor",
          limit: 25,
        });
      }).pipe(
        Effect.provide(
          DeploymentsLive.pipe(Layer.provide(recording([]).layer))
        ),
        Effect.either
      )
    );

    expect(result._tag).toBe("Left");
  });

  /** The rows come from SQL, so a column that changes shape has to surface as
   * a failure rather than reaching a caller as a decoded value. */
  test("fails rather than serving a row the schema rejects", async () => {
    const invalid = { ...row("chev_1", null, 0), toVersion: -1 };

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const deployments = yield* Deployments;
        return yield* deployments.list(actor, { limit: 25 });
      }).pipe(
        Effect.provide(
          DeploymentsLive.pipe(Layer.provide(recording([invalid]).layer))
        ),
        Effect.either
      )
    );

    expect(result._tag).toBe("Left");
  });
});
