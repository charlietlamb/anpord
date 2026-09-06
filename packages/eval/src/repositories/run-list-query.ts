import { Database } from "@anpord/db/client";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { and, count, desc, eq, lt, or } from "drizzle-orm";
import { Effect } from "effect";
import type { PageCursor } from "../domain/page";
import { tryStore } from "./query";

export interface ListRunsInput {
  readonly cursor: PageCursor | null;
  readonly limit: number;
  readonly organizationId: string;
}

/* Keyset, not offset: constant cost per page, and a run started mid-read cannot
   shift a page. The id breaks ties on same-millisecond timestamps. */
const cursorBefore = (cursor: PageCursor | null) =>
  cursor === null
    ? undefined
    : or(
        lt(evalRun.createdAt, new Date(cursor.startedAtMillis)),
        and(
          eq(evalRun.createdAt, new Date(cursor.startedAtMillis)),
          lt(evalRun.id, cursor.id)
        )
      );

export const runListQuery = Effect.map(Database, (db) => ({
  countRuns: (organizationId: string) =>
    tryStore("runQuery.countRuns", () =>
      db
        .select({ total: count() })
        .from(evalRun)
        .where(eq(evalRun.organizationId, organizationId))
    ).pipe(
      Effect.map((rows) => rows[0]?.total ?? 0),
      Effect.withSpan("RunQuery.countRuns")
    ),
  /* Counted in the database: runs started by another process hold sandboxes
     against the same organisation. */
  countRunning: (organizationId: string) =>
    tryStore("runQuery.countRunning", () =>
      db
        .select({ total: count() })
        .from(evalRun)
        .where(
          and(
            eq(evalRun.organizationId, organizationId),
            eq(evalRun.status, "running")
          )
        )
    ).pipe(
      Effect.map((rows) => rows[0]?.total ?? 0),
      Effect.withSpan("RunQuery.countRunning")
    ),
  listRuns: (input: ListRunsInput) =>
    tryStore("runQuery.listRuns", () =>
      db
        .select()
        .from(evalRun)
        .where(
          and(
            eq(evalRun.organizationId, input.organizationId),
            cursorBefore(input.cursor)
          )
        )
        .orderBy(desc(evalRun.createdAt), desc(evalRun.id))
        .limit(input.limit + 1)
    ).pipe(Effect.withSpan("RunQuery.listRuns")),
}));
