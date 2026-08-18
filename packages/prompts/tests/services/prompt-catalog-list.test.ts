import { describe, expect, test } from "bun:test";
import { IdGenerator } from "@anpord/ids/id";
import type { PromptSortOrder } from "@anpord/schema/domain/prompts";
import { Effect, Exit, Layer } from "effect";
import { ChannelRepository } from "../../src/repositories/channel-repository";
import type { PromptListRow } from "../../src/repositories/prompt-list-query";
import {
  PromptRepository,
  type PromptRepositoryShape,
} from "../../src/repositories/prompt-repository";
import { PromptVersionRepository } from "../../src/repositories/prompt-version-repository";
import { PromptCache } from "../../src/services/prompt-cache";
import {
  PromptCatalog,
  PromptCatalogLive,
  type PromptListQuery,
} from "../../src/services/prompt-catalog";
import { PromptPublishing } from "../../src/services/prompt-publishing";
import { actor, noopCache } from "../fixtures/prompt-rows";

const unreachable = (method: string) => () =>
  Effect.die(`unexpected call to ${method}`);

const row = (
  id: string,
  updatedAt: string,
  extra: {
    description?: string | null;
    name?: string;
    productionVersion?: number | null;
  } = {}
): PromptListRow => ({
  description: extra.description ?? null,
  id,
  internalId: `pr_${id}`,
  latestVersion: 1,
  name: extra.name ?? id,
  productionVersion: extra.productionVersion ?? null,
  updatedAt: new Date(updatedAt),
});

/** Stands in for Postgres: the same ordering, the same case-insensitive LIKE
 * with `%` and `_` treated literally, and the same `limit + 1` fetch, so the
 * paging assertions below exercise the real contract the query promises. */
const fakeStore = (rows: readonly PromptListRow[]): PromptRepositoryShape => ({
  archive: unreachable("archive"),
  findById: unreachable("findById"),
  findByIdIncludingArchived: unreachable("findByIdIncludingArchived"),
  idExists: unreachable("idExists"),
  insert: unreachable("insert"),
  listByOrganization: (_organizationId, params) => {
    const byName = params.sort === "name";

    const ordered = [...rows].sort((left, right) => {
      if (byName) {
        const byLabel = left.name.localeCompare(right.name);
        return byLabel === 0 ? left.id.localeCompare(right.id) : byLabel;
      }
      const byTime = right.updatedAt.getTime() - left.updatedAt.getTime();
      return byTime === 0 ? right.id.localeCompare(left.id) : byTime;
    });

    const term = params.search?.toLowerCase();
    const matched = ordered.filter((candidate) => {
      if (params.status === "live" && candidate.productionVersion === null) {
        return false;
      }
      if (params.status === "draft" && candidate.productionVersion !== null) {
        return false;
      }
      if (term === undefined) {
        return true;
      }
      return [candidate.id, candidate.name, candidate.description].some(
        (field) => field?.toLowerCase().includes(term) ?? false
      );
    });

    const cursor = params.cursor;
    const after = matched.filter((candidate) => {
      if (cursor === undefined) {
        return true;
      }
      if (cursor.sort === "name") {
        const byLabel = candidate.name.localeCompare(cursor.name);
        return byLabel > 0 || (byLabel === 0 && candidate.id > cursor.id);
      }
      const time = candidate.updatedAt.getTime();
      return (
        time < cursor.updatedAt ||
        (time === cursor.updatedAt && candidate.id < cursor.id)
      );
    });

    return Effect.succeed(after.slice(0, params.limit + 1));
  },
  touch: unreachable("touch"),
  update: unreachable("update"),
});

const list = (rows: readonly PromptListRow[], query: PromptListQuery) =>
  Effect.runPromiseExit(
    Effect.gen(function* () {
      const catalog = yield* PromptCatalog;
      return yield* catalog.list(actor, query);
    }).pipe(
      Effect.provide(
        PromptCatalogLive.pipe(
          Layer.provide(
            Layer.mergeAll(
              Layer.succeed(PromptRepository, fakeStore(rows)),
              Layer.succeed(PromptVersionRepository, {
                append: unreachable("append"),
                byNumber: unreachable("byNumber"),
                latest: unreachable("latest"),
                list: unreachable("list"),
                update: unreachable("update"),
              }),
              Layer.succeed(PromptPublishing, {
                listChannels: unreachable("listChannels"),
                publishVersion: unreachable("publishVersion"),
                setChannel: unreachable("setChannel"),
              }),
              Layer.succeed(ChannelRepository, {
                byName: unreachable("byName"),
                defaultChannel: unreachable("defaultChannel"),
                insert: unreachable("insert"),
                list: unreachable("list"),
                remove: unreachable("remove"),
                setDefault: unreachable("setDefault"),
                update: unreachable("update"),
              }),
              Layer.succeed(PromptCache, noopCache),
              Layer.succeed(IdGenerator, {
                generate: unreachable("generate"),
              } as unknown as typeof IdGenerator.Service)
            )
          )
        )
      )
    )
  );

const idsOf = (
  exit: Exit.Exit<{ items: readonly { id: string }[] }, unknown>
) => (Exit.isSuccess(exit) ? exit.value.items.map((item) => item.id) : null);

const catalogue = [
  row("alpha", "2026-01-05T00:00:00.000Z", { name: "Alpha greeting" }),
  row("bravo", "2026-01-04T00:00:00.000Z", { description: "a farewell" }),
  row("charlie", "2026-01-03T00:00:00.000Z"),
  row("delta", "2026-01-02T00:00:00.000Z"),
  row("echo", "2026-01-01T00:00:00.000Z"),
];

describe("PromptCatalog.list search", () => {
  test("matches on name", async () => {
    const exit = await list(catalogue, { limit: 10, search: "Alpha greeting" });

    expect(idsOf(exit)).toEqual(["alpha"]);
  });

  test("matches on id", async () => {
    const exit = await list(catalogue, { limit: 10, search: "bravo" });

    expect(idsOf(exit)).toEqual(["bravo"]);
  });

  test("matches on description", async () => {
    const exit = await list(catalogue, { limit: 10, search: "farewell" });

    expect(idsOf(exit)).toEqual(["bravo"]);
  });

  test("ignores case", async () => {
    const exit = await list(catalogue, { limit: 10, search: "ALPHA" });

    expect(idsOf(exit)).toEqual(["alpha"]);
  });

  test("treats % as a literal, not a wildcard", async () => {
    const rows = [
      row("discount", "2026-01-02T00:00:00.000Z", { name: "100% off" }),
      row("plain", "2026-01-01T00:00:00.000Z", { name: "nothing special" }),
    ];

    const exit = await list(rows, { limit: 10, search: "%" });

    expect(idsOf(exit)).toEqual(["discount"]);
  });

  test("treats _ as a literal, not a single character wildcard", async () => {
    const rows = [
      row("snake_case", "2026-01-02T00:00:00.000Z"),
      row("kebab-case", "2026-01-01T00:00:00.000Z"),
    ];

    const exit = await list(rows, { limit: 10, search: "e_c" });

    expect(idsOf(exit)).toEqual(["snake_case"]);
  });
});

describe("PromptCatalog.list pagination", () => {
  test("returns exactly the limit with a cursor when more remain", async () => {
    const exit = await list(catalogue, { limit: 2 });

    expect(idsOf(exit)).toEqual(["alpha", "bravo"]);
    if (Exit.isSuccess(exit)) {
      expect(exit.value.nextCursor).toBeString();
    }
  });

  test("ends with a null cursor once the last row is read", async () => {
    const exit = await list(catalogue, { limit: 5 });

    expect(idsOf(exit)).toHaveLength(5);
    if (Exit.isSuccess(exit)) {
      expect(exit.value.nextCursor).toBeNull();
    }
  });

  test("reports no next page when the final page is exactly full", async () => {
    const exit = await list(catalogue.slice(0, 2), { limit: 2 });

    if (Exit.isSuccess(exit)) {
      expect(exit.value.nextCursor).toBeNull();
    }
  });

  test("fails cleanly on a tampered cursor", async () => {
    const exit = await list(catalogue, { cursor: "!!nonsense", limit: 2 });

    expect(Exit.isFailure(exit)).toBe(true);
    expect(String(exit)).toContain("InvalidCursor");
    expect(String(exit)).not.toContain("Die");
  });
});

const pageThrough = async (
  rows: readonly PromptListRow[],
  limit: number,
  sort?: PromptSortOrder
): Promise<readonly string[]> => {
  const seen: string[] = [];
  let cursor: string | undefined;

  for (let guard = 0; guard <= rows.length + 1; guard += 1) {
    const exit = await list(rows, { cursor, limit, sort });
    if (!Exit.isSuccess(exit)) {
      throw new Error(`paging failed: ${exit}`);
    }

    seen.push(...exit.value.items.map((item) => item.id));

    if (exit.value.nextCursor === null) {
      return seen;
    }
    cursor = exit.value.nextCursor;
  }

  throw new Error("paging did not terminate");
};

describe("PromptCatalog.list paging over every row", () => {
  test("yields each row exactly once", async () => {
    const seen = await pageThrough(catalogue, 2);

    expect(seen).toEqual(["alpha", "bravo", "charlie", "delta", "echo"]);
  });

  test("does not drop or duplicate rows sharing one timestamp", async () => {
    const sameInstant = "2026-02-01T00:00:00.000Z";
    const rows = [
      row("one", sameInstant),
      row("two", sameInstant),
      row("three", sameInstant),
      row("four", sameInstant),
      row("five", sameInstant),
    ];

    const seen = await pageThrough(rows, 2);

    expect([...seen].sort()).toEqual(["five", "four", "one", "three", "two"]);
    expect(new Set(seen).size).toBe(rows.length);
  });

  test("survives a limit of one across tied timestamps", async () => {
    const tied = "2026-03-01T00:00:00.000Z";
    const rows = [
      row("a", tied),
      row("b", tied),
      row("c", "2026-02-01T00:00:00.000Z"),
    ];

    const seen = await pageThrough(rows, 1);

    expect(seen).toEqual(["b", "a", "c"]);
  });
});

const mixed = [
  row("live-one", "2026-01-05T00:00:00.000Z", { productionVersion: 3 }),
  row("draft-one", "2026-01-04T00:00:00.000Z"),
  row("live-two", "2026-01-03T00:00:00.000Z", { productionVersion: 1 }),
  row("draft-two", "2026-01-02T00:00:00.000Z"),
];

describe("PromptCatalog.list status", () => {
  test("live keeps only prompts with a production placement", async () => {
    const exit = await list(mixed, { limit: 10, status: "live" });

    expect(idsOf(exit)).toEqual(["live-one", "live-two"]);
  });

  test("draft keeps only prompts without a production placement", async () => {
    const exit = await list(mixed, { limit: 10, status: "draft" });

    expect(idsOf(exit)).toEqual(["draft-one", "draft-two"]);
  });

  test("all keeps every prompt", async () => {
    const exit = await list(mixed, { limit: 10, status: "all" });

    expect(idsOf(exit)).toHaveLength(4);
  });

  test("an absent status filters nothing", async () => {
    const exit = await list(mixed, { limit: 10 });

    expect(idsOf(exit)).toHaveLength(4);
  });

  test("pages a filtered list without leaking the other status", async () => {
    const seen = await pageThrough(
      mixed.filter((r) => r.productionVersion !== null),
      1
    );

    expect(seen).toEqual(["live-one", "live-two"]);
  });
});

const alphabetical = [
  row("c", "2026-01-01T00:00:00.000Z", { name: "Cherry" }),
  row("a", "2026-01-05T00:00:00.000Z", { name: "Apple" }),
  row("b", "2026-01-03T00:00:00.000Z", { name: "Banana" }),
];

describe("PromptCatalog.list sort", () => {
  test("orders by name ascending rather than recency", async () => {
    const exit = await list(alphabetical, { limit: 10, sort: "name" });

    expect(idsOf(exit)).toEqual(["a", "b", "c"]);
  });

  test("falls back to recency when no sort is given", async () => {
    const recent = [
      row("oldest", "2026-01-01T00:00:00.000Z", { name: "Apple" }),
      row("newest", "2026-01-09T00:00:00.000Z", { name: "Zebra" }),
      row("middle", "2026-01-05T00:00:00.000Z", { name: "Mango" }),
    ];

    const exit = await list(recent, { limit: 10 });

    expect(idsOf(exit)).toEqual(["newest", "middle", "oldest"]);
  });

  test("breaks equal names with the id, ascending", async () => {
    const duplicates = [
      row("zulu", "2026-01-01T00:00:00.000Z", { name: "Same" }),
      row("alpha", "2026-01-02T00:00:00.000Z", { name: "Same" }),
      row("mike", "2026-01-03T00:00:00.000Z", { name: "Same" }),
    ];

    const exit = await list(duplicates, { limit: 10, sort: "name" });

    expect(idsOf(exit)).toEqual(["alpha", "mike", "zulu"]);
  });
});

describe("PromptCatalog.list paging by name", () => {
  test("yields each row exactly once", async () => {
    const seen = await pageThrough(alphabetical, 1, "name");

    expect(seen).toEqual(["a", "b", "c"]);
  });

  test("does not drop or duplicate rows sharing one name", async () => {
    const duplicates = [
      row("one", "2026-01-01T00:00:00.000Z", { name: "Same" }),
      row("two", "2026-01-02T00:00:00.000Z", { name: "Same" }),
      row("three", "2026-01-03T00:00:00.000Z", { name: "Same" }),
      row("four", "2026-01-04T00:00:00.000Z", { name: "Same" }),
      row("five", "2026-01-05T00:00:00.000Z", { name: "Same" }),
    ];

    const seen = await pageThrough(duplicates, 2, "name");

    expect(seen).toEqual(["five", "four", "one", "three", "two"]);
    expect(new Set(seen).size).toBe(duplicates.length);
  });

  test("keeps every row when names collide across page boundaries", async () => {
    const duplicates = [
      row("a1", "2026-01-01T00:00:00.000Z", { name: "Dup" }),
      row("a2", "2026-01-02T00:00:00.000Z", { name: "Dup" }),
      row("b1", "2026-01-03T00:00:00.000Z", { name: "Other" }),
    ];

    const seen = await pageThrough(duplicates, 1, "name");

    expect(seen).toEqual(["a1", "a2", "b1"]);
  });
});

describe("PromptCatalog.list cursor sort agreement", () => {
  const firstCursor = async (sort: PromptSortOrder) => {
    const exit = await list(alphabetical, { limit: 1, sort });
    if (!Exit.isSuccess(exit) || exit.value.nextCursor === null) {
      throw new Error("expected a next cursor");
    }
    return exit.value.nextCursor;
  };

  test("rejects an updated cursor replayed against the name sort", async () => {
    const cursor = await firstCursor("updated");
    const exit = await list(alphabetical, { cursor, limit: 1, sort: "name" });

    expect(Exit.isFailure(exit)).toBe(true);
    expect(String(exit)).toContain("InvalidCursor");
  });

  test("rejects a name cursor replayed against the updated sort", async () => {
    const cursor = await firstCursor("name");
    const exit = await list(alphabetical, {
      cursor,
      limit: 1,
      sort: "updated",
    });

    expect(Exit.isFailure(exit)).toBe(true);
    expect(String(exit)).toContain("InvalidCursor");
  });

  test("accepts a cursor replayed under the sort that issued it", async () => {
    const cursor = await firstCursor("name");
    const exit = await list(alphabetical, { cursor, limit: 1, sort: "name" });

    expect(idsOf(exit)).toEqual(["b"]);
  });
});
