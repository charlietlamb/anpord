import { describe, expect, test } from "bun:test";
import type { Database } from "@anpord/db/client";
import { OrganizationId } from "@anpord/schema/domain/actor";
import { drizzle } from "drizzle-orm/node-postgres";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  afterCursor,
  selectDeploymentList,
} from "../../src/repositories/deployment-list-query";

const dialect = new PgDialect();
const db = drizzle.mock() as unknown as Database["Type"];
const organizationId = OrganizationId.make("org_1");

const sqlFor = (params: Parameters<typeof selectDeploymentList>[2]) =>
  selectDeploymentList(db, organizationId, params).toSQL().sql;

/** The service tests page against an in-memory store, so only these assertions
 * can catch a keyset predicate that stops matching the order it pages under. */
describe("afterCursor", () => {
  /** Cast rather than bound as a parameter: `created_at` has no zone, so the
   * comparison has to be made against a wall clock too. Bind an instant and
   * the offset shifts the boundary and rows repeat across pages. */
  test("compares the timestamp and the id as one tuple", () => {
    const predicate = dialect.sqlToQuery(
      afterCursor({ deployedAt: "2026-08-16 22:49:34.754", id: "chev_1" })
    ).sql;

    expect(predicate).toBe(
      '("prompt_channel_event"."created_at", "prompt_channel_event"."internal_id") < ($1::timestamp, $2)'
    );
  });
});

describe("selectDeploymentList", () => {
  /** Two channels moved in the same millisecond share a timestamp, so the id
   * has to break the tie in the ordering as well as in the predicate. Order by
   * the timestamp alone and the pair can be read in either order, which is
   * what lets a row fall through a page boundary. */
  test("orders by the same tuple it pages on", () => {
    const sql = sqlFor({ limit: 25 });

    expect(sql).toContain(
      'order by "prompt_channel_event"."created_at" desc, "prompt_channel_event"."internal_id" desc'
    );
  });

  test("scopes every read to the caller's organization", () => {
    expect(sqlFor({ limit: 25 })).toContain('"prompt"."organization_id" = $1');
  });

  test("filters on the channel recorded at the time of the move", () => {
    const sql = sqlFor({ channel: "production", limit: 25 });

    expect(sql).toContain('"prompt_channel_event"."channel" = ');
  });

  test("filters by prompt without dropping the organization", () => {
    const sql = sqlFor({ limit: 25, promptId: "greeting" });

    expect(sql).toContain('"prompt"."organization_id" = ');
    expect(sql).toContain('"prompt"."id" = ');
  });

  /** A version can be deleted and an actor can be removed, and neither should
   * take the deployment with it: the joins that may be absent are left joins,
   * and only the destination version is required. */
  test("keeps a row whose author or previous version is gone", () => {
    const sql = sqlFor({ limit: 25 });

    expect(sql).toContain('left join "prompt_version" "from_version"');
    expect(sql).toContain('left join "user"');
    expect(sql).toContain('inner join "prompt_version" "to_version"');
  });
});
