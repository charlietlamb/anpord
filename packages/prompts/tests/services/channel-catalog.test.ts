import { describe, expect, test } from "bun:test";
import { IdGenerator } from "@anpord/ids/id";
import { ChannelName } from "@anpord/schema/domain/prompts";
import { Effect, Exit, Layer, Option } from "effect";
import {
  type ChannelCountRow,
  ChannelRepository,
  type ChannelRepositoryShape,
} from "../../src/repositories/channel-repository";
import {
  ChannelCatalog,
  ChannelCatalogLive,
} from "../../src/services/channel-catalog";
import { PromptCache } from "../../src/services/prompt-cache";
import { actor, noopCache } from "../fixtures/prompt-rows";

const at = new Date("2026-01-01T00:00:00.000Z");

const countRow = (
  name: string,
  promptCount: number,
  color = "slate"
): ChannelCountRow => ({ color, createdAt: at, name, promptCount });

const ids = Layer.succeed(IdGenerator, {
  generate: () => Effect.succeed("chl_TEST"),
});

/** The repository is backed by a mutable array so a create or rename is visible
 * to the read-back the service performs afterwards. */
const repositoryWith = (
  initial: readonly ChannelCountRow[],
  defaultName?: string
) => {
  const rows = [...initial];

  const shape: ChannelRepositoryShape = {
    byName: (_org, name) =>
      Effect.succeed(
        Option.fromNullable(rows.find((row) => row.name === name)).pipe(
          Option.map((row) => ({
            color: row.color,
            createdAt: row.createdAt,
            internalId: `chl_${row.name}`,
            isDefault: false,
            name: row.name,
            organizationId: actor.organizationId,
          }))
        )
      ),
    defaultChannel: () =>
      Effect.succeed(
        Option.fromNullable(rows.find((row) => row.name === defaultName)).pipe(
          Option.map((row) => ({
            color: row.color,
            createdAt: row.createdAt,
            internalId: `chl_${row.name}`,
            isDefault: true,
            name: row.name,
            organizationId: actor.organizationId,
          }))
        )
      ),
    insert: (input) =>
      Effect.sync(() => {
        rows.push(countRow(input.name, 0, input.color));
      }),
    setDefault: () => Effect.void,
    list: () => Effect.succeed(rows),
    remove: (internalId) =>
      Effect.sync(() => {
        const name = internalId.replace("chl_", "");
        const index = rows.findIndex((row) => row.name === name);
        rows.splice(index, 1);
      }),
    update: (internalId, changes) =>
      Effect.sync(() => {
        const name = internalId.replace("chl_", "");
        const index = rows.findIndex((row) => row.name === name);
        const current = rows[index];
        if (current) {
          rows[index] = {
            ...current,
            color: changes.color ?? current.color,
            name: changes.name ?? current.name,
          };
        }
      }),
  };

  return shape;
};

const run = <A, E>(
  rows: readonly ChannelCountRow[],
  use: (catalog: ChannelCatalog["Type"]) => Effect.Effect<A, E>,
  defaultName?: string
) =>
  Effect.runPromiseExit(
    Effect.gen(function* () {
      const catalog = yield* ChannelCatalog;
      return yield* use(catalog);
    }).pipe(
      Effect.provide(
        ChannelCatalogLive.pipe(
          Layer.provide(
            Layer.mergeAll(
              Layer.succeed(
                ChannelRepository,
                repositoryWith(rows, defaultName)
              ),
              Layer.succeed(PromptCache, noopCache),
              ids
            )
          )
        )
      )
    )
  );

describe("ChannelCatalog", () => {
  test("list reports prompt counts including channels nothing points at", async () => {
    const exit = await run(
      [countRow("production", 4, "green"), countRow("staging", 0)],
      (catalog) => catalog.list(actor)
    );

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value.map((entry) => entry.name)).toEqual([
        ChannelName.make("production"),
        ChannelName.make("staging"),
      ]);
      expect(exit.value.map((entry) => entry.promptCount)).toEqual([4, 0]);
      expect(exit.value[0]?.color).toBe("green");
    }
  });

  test("create rejects a name the organisation already uses", async () => {
    const exit = await run([countRow("staging", 0)], (catalog) =>
      catalog.create(actor, {
        color: "blue",
        name: ChannelName.make("staging"),
      })
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(String(exit.cause)).toContain("ChannelNameTaken");
    }
  });

  test("create returns the stored channel", async () => {
    const exit = await run([], (catalog) =>
      catalog.create(actor, { color: "teal", name: ChannelName.make("qa") })
    );

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value.name).toBe(ChannelName.make("qa"));
      expect(exit.value.color).toBe("teal");
      expect(exit.value.promptCount).toBe(0);
    }
  });

  test("update renames and recolours a channel", async () => {
    const exit = await run([countRow("staging", 2)], (catalog) =>
      catalog.update(actor, ChannelName.make("staging"), {
        color: "amber",
        name: ChannelName.make("preprod"),
      })
    );

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value.name).toBe(ChannelName.make("preprod"));
      expect(exit.value.color).toBe("amber");
      expect(exit.value.promptCount).toBe(2);
    }
  });

  test("update fails when the channel does not exist", async () => {
    const exit = await run([], (catalog) =>
      catalog.update(actor, ChannelName.make("ghost"), { color: "red" })
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(String(exit.cause)).toContain("ChannelMissing");
    }
  });

  test("renaming onto an existing channel conflicts", async () => {
    const exit = await run(
      [countRow("staging", 0), countRow("qa", 0)],
      (catalog) =>
        catalog.update(actor, ChannelName.make("staging"), {
          name: ChannelName.make("qa"),
        })
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(String(exit.cause)).toContain("ChannelNameTaken");
    }
  });

  test("recolouring production is allowed", async () => {
    const exit = await run([countRow("production", 3, "green")], (catalog) =>
      catalog.update(actor, ChannelName.make("production"), { color: "blue" })
    );

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value.color).toBe("blue");
    }
  });

  test("the default channel cannot be renamed", async () => {
    const exit = await run(
      [countRow("production", 1, "green")],
      (catalog) =>
        catalog.update(actor, ChannelName.make("production"), {
          name: ChannelName.make("live"),
        }),
      "production"
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(String(exit.cause)).toContain("ChannelReserved");
    }
  });

  test("the default channel cannot be deleted", async () => {
    const exit = await run(
      [countRow("production", 0, "green")],
      (catalog) => catalog.remove(actor, ChannelName.make("production")),
      "production"
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(String(exit.cause)).toContain("ChannelReserved");
    }
  });

  test("a channel named production is ordinary when it is not the default", async () => {
    const exit = await run([countRow("production", 0, "green")], (catalog) =>
      catalog.remove(actor, ChannelName.make("production"))
    );

    expect(Exit.isSuccess(exit)).toBe(true);
  });

  test("delete is refused while prompts still point at the channel", async () => {
    const exit = await run([countRow("staging", 2)], (catalog) =>
      catalog.remove(actor, ChannelName.make("staging"))
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(String(exit.cause)).toContain("ChannelInUse");
    }
  });

  test("delete removes a channel nothing points at", async () => {
    const exit = await run([countRow("staging", 0)], (catalog) =>
      catalog.remove(actor, ChannelName.make("staging"))
    );

    expect(Exit.isSuccess(exit)).toBe(true);
  });
});
