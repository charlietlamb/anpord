import { describe, expect, test } from "bun:test";
import type { Database } from "@anpord/db/client";
import { OrganizationId } from "@anpord/schema/domain/actor";
import { PromptId, PromptName } from "@anpord/schema/domain/prompts";
import { drizzle } from "drizzle-orm/node-postgres";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  afterCursor,
  selectPromptList,
} from "../../src/repositories/prompt-list-query";

const dialect = new PgDialect();

const toSql = (fragment: ReturnType<typeof afterCursor>) =>
  dialect.sqlToQuery(fragment).sql;

/** The service tests page against an in-memory store, so only these assertions
 * can catch a keyset predicate that stops matching the order it pages under. */
describe("afterCursor", () => {
  test("compares the updated tuple downwards", () => {
    const predicate = toSql(
      afterCursor({
        id: PromptId.make("greeting"),
        sort: "updated",
        updatedAt: 0,
      })
    );

    expect(predicate).toBe('("prompt"."updated_at", "prompt"."id") < ($1, $2)');
  });

  test("compares the name tuple upwards", () => {
    const predicate = toSql(
      afterCursor({
        id: PromptId.make("greeting"),
        name: PromptName.make("Alpha"),
        sort: "name",
      })
    );

    expect(predicate).toBe('("prompt"."name", "prompt"."id") > ($1, $2)');
  });

  test("always breaks ties on the id", () => {
    const both = [
      afterCursor({ id: PromptId.make("a"), sort: "updated", updatedAt: 0 }),
      afterCursor({
        id: PromptId.make("a"),
        name: PromptName.make("A"),
        sort: "name",
      }),
    ];

    for (const fragment of both) {
      expect(toSql(fragment)).toContain('"prompt"."id"');
    }
  });
});

/** `prompt_channel.name` no longer exists, so the production placement is only
 * reachable by joining the organisation's channel row. */
describe("selectPromptList", () => {
  const query = selectPromptList(
    drizzle({} as never) as unknown as Database["Type"],
    OrganizationId.make("org_1"),
    { limit: 10 }
  ).toSQL().sql;

  test("reaches production through the channel table", () => {
    expect(query).toContain('"channel"."name"');
    expect(query).toContain(
      '"prompt_channel"."channel_internal_id" = "channel"."internal_id"'
    );
  });

  test("never selects the dropped prompt_channel name column", () => {
    expect(query).not.toContain('"prompt_channel"."name"');
  });

  test("scopes the channel join to the organisation", () => {
    expect(query).toContain('"channel"."organization_id"');
  });
});
