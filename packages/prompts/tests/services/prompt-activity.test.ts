import { describe, expect, test } from "bun:test";
import type { PromptActivityEntry } from "@anpord/schema/domain/prompt-activity";
import { Effect, Layer } from "effect";
import {
  PromptEventRepository,
  type PromptEventRepositoryShape,
  type PromptEventRow,
} from "../../src/repositories/prompt-event-repository";
import type { ActivityQuery } from "../../src/services/prompt-activity";
import {
  PromptActivity,
  PromptActivityLive,
} from "../../src/services/prompt-activity";
import { actor } from "../fixtures/prompt-rows";

const at = new Date("2026-01-01T00:00:00.000Z");

const row = (
  internalId: string,
  from: number | null,
  version: number
): PromptEventRow => ({
  actor: null,
  at,
  channel: "production",
  from,
  internalId,
  kind: "deployed",
  message: null,
  promptId: "greeting",
  version,
});

/** Narrows to the one member these assertions are about, so a wrong tag fails
 * the test rather than reading as an absent field. */
const deployed = (entry: PromptActivityEntry | undefined) => {
  if (entry?._tag !== "deployed") {
    throw new Error(`expected a deployment, got ${entry?._tag}`);
  }
  return entry;
};

/** Records what the service asked for, so the paging arithmetic can be checked
 * rather than inferred from the rows that come back. */
const recording = (rows: readonly PromptEventRow[]) => {
  const asked: { limit?: number } = {};

  const layer = Layer.succeed(PromptEventRepository, {
    list: (_org, params) => {
      asked.limit = params.limit;
      return Effect.succeed(rows.slice(0, params.limit));
    },
    record: () => Effect.void,
  } satisfies PromptEventRepositoryShape);

  return { asked, layer };
};

const listWith = (
  rows: readonly PromptEventRow[],
  query: Partial<ActivityQuery> = {}
) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const deployments = yield* PromptActivity;
      return yield* deployments.list(actor, { limit: 25, ...query });
    }).pipe(
      Effect.provide(
        PromptActivityLive.pipe(Layer.provide(recording(rows).layer))
      )
    )
  );

describe("PromptActivity", () => {
  test("names a move with no previous version a first deploy", async () => {
    const page = await listWith([row("pev_1", null, 1)]);

    const entry = deployed(page.items[0]);

    expect(entry.move).toBe("first");
    expect(entry.from).toBeNull();
  });

  test("names a move to a higher version a promotion", async () => {
    const page = await listWith([row("pev_1", 4, 5)]);

    expect(deployed(page.items[0]).move).toBe("promotion");
  });

  test("names a move to a lower version a rollback", async () => {
    const page = await listWith([row("pev_1", 7, 5)]);

    expect(deployed(page.items[0]).move).toBe("rollback");
  });

  /** Three of the twenty-three rows in production are this shape. Calling them
   * promotions would say something changed for callers when nothing did. */
  test("names a move to the serving version a repeat", async () => {
    const page = await listWith([row("pev_1", 6, 6)]);

    expect(deployed(page.items[0]).move).toBe("repeat");
  });

  /** A user can be deleted while the deployment they made stays. The row keeps
   * its shape and arrives with nulls, which is nobody rather than a person
   * with no name. */
  test("serves a deployment whose author has been deleted", async () => {
    const orphaned: PromptEventRow = {
      ...row("pev_1", 1, 2),
      actor: { image: null, name: null },
    };

    const page = await listWith([orphaned]);

    expect(page.items[0]?.actor).toBeNull();
  });

  test("keeps the order the repository returned", async () => {
    const page = await listWith([
      row("pev_3", 2, 3),
      row("pev_2", 1, 2),
      row("pev_1", null, 1),
    ]);

    expect(page.items.map((entry) => entry.id)).toEqual([
      "pev_3",
      "pev_2",
      "pev_1",
    ]);
  });

  test("asks for one more row than the caller wanted", async () => {
    const { asked, layer } = recording([row("pev_1", null, 1)]);

    await Effect.runPromise(
      Effect.gen(function* () {
        const deployments = yield* PromptActivity;
        return yield* deployments.list(actor, { limit: 10 });
      }).pipe(Effect.provide(PromptActivityLive.pipe(Layer.provide(layer))))
    );

    expect(asked.limit).toBe(11);
  });

  /** The extra row is the only honest signal that a page is not the last one:
   * a full page and a final page are the same length. */
  test("offers a cursor only when a further row exists", async () => {
    const three = [
      row("pev_3", 2, 3),
      row("pev_2", 1, 2),
      row("pev_1", null, 1),
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
        const deployments = yield* PromptActivity;
        return yield* deployments.list(actor, {
          cursor: "not-a-real-cursor",
          limit: 25,
        });
      }).pipe(
        Effect.provide(
          PromptActivityLive.pipe(Layer.provide(recording([]).layer))
        ),
        Effect.either
      )
    );

    expect(result._tag).toBe("Left");
  });

  /** The rows come from SQL, so a column that changes shape has to surface as
   * a failure rather than reaching a caller as a decoded value. */
  test("fails rather than serving a row the schema rejects", async () => {
    const invalid = { ...row("pev_1", null, 1), kind: "invented" };

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const deployments = yield* PromptActivity;
        return yield* deployments.list(actor, { limit: 25 });
      }).pipe(
        Effect.provide(
          PromptActivityLive.pipe(Layer.provide(recording([invalid]).layer))
        ),
        Effect.either
      )
    );

    expect(result._tag).toBe("Left");
  });
});
