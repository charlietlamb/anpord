import { describe, expect, test } from "bun:test";
import type { Database } from "@anpord/db/client";
import { OrganizationId } from "@anpord/schema/domain/actor";
import { PromptId, PromptName } from "@anpord/schema/domain/prompts";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  selectPlacementPrompts,
  selectPlacementsFor,
  selectPlacementTotals,
} from "../../src/repositories/placement-list-query";

const db = drizzle.mock() as unknown as Database["Type"];
const organizationId = OrganizationId.make("org_1");

const promptsSql = (params: Parameters<typeof selectPlacementPrompts>[2]) =>
  selectPlacementPrompts(db, organizationId, params).toSQL().sql;

describe("selectPlacementPrompts", () => {
  test("scopes every read to the caller's organization", () => {
    expect(promptsSql({ limit: 25 })).toContain(
      '"prompt"."organization_id" = $1'
    );
  });

  /** An archived prompt is not deleted, so it has to be filtered rather than
   * assumed gone, or the grid offers channels to point at something nobody
   * can reach. */
  test("leaves archived prompts out", () => {
    expect(promptsSql({ limit: 25 })).toContain('"archived_at" is null');
  });

  /** Ordered by name, so the cursor has to compare names, and the id breaks
   * ties because two prompts can share one. */
  test("orders by the same tuple it pages on", () => {
    const sql = promptsSql({
      cursor: {
        id: PromptId.make("greeting"),
        name: PromptName.make("Greeting"),
        sort: "name",
      },
      limit: 25,
    });

    expect(sql).toContain('("prompt"."name", "prompt"."id") > ($2, $3)');
    expect(sql).toContain('order by "prompt"."name" asc, "prompt"."id" asc');
  });

  /** One more than asked for, so a full page can be told from the last one
   * without a second request that returns nothing. */
  test("reads one row past the page", () => {
    expect(promptsSql({ limit: 25 })).toContain("limit $2");
  });

  test("matches a search against the id and the name", () => {
    const sql = promptsSql({ limit: 25, search: "refund" });

    expect(sql).toContain('"prompt"."id" ilike');
    expect(sql).toContain('"prompt"."name" ilike');
  });
});

describe("selectPlacementsFor", () => {
  /** A version or an actor can be missing without the placement being wrong,
   * but a placement with no channel is not a placement at all. */
  test("keeps a placement whose author is gone", () => {
    const sql = selectPlacementsFor(db, ["pmt_1"]).toSQL().sql;

    expect(sql).toContain('inner join "channel"');
    expect(sql).toContain('inner join "prompt_version"');
    expect(sql).toContain('left join "user"');
  });

  test("reads every prompt on the page in one query", () => {
    const sql = selectPlacementsFor(db, ["pmt_1", "pmt_2"]).toSQL().sql;

    expect(sql).toContain('"prompt_internal_id" in ($1, $2)');
  });
});

describe("selectPlacementTotals", () => {
  /** Counted over the organisation rather than the page, so the summary holds
   * still while the reader pages through the grid. */
  test("counts distinct prompts rather than placements", () => {
    const sql = selectPlacementTotals(db, organizationId).toSQL().sql;

    expect(sql).toContain('count(distinct "prompt"."internal_id")');
    expect(sql).toContain('"prompt"."organization_id" = $1');
  });
});
