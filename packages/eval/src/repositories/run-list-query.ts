import { Database } from "@anpord/db/client";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { and, count, desc, eq, lt, or } from "drizzle-orm";
import { Effect } from "effect";
import type { PageCursor } from "../domain/page";
import { tryStore } from "./query";

export interface ListRunsInput {
  /** Null on the first page. Names where the last one ended rather than how
   * many rows to skip, so a run started between two fetches cannot shift a
   * page under a reader. */
  readonly cursor: PageCursor | null;
  readonly limit: number;
  readonly organizationId: string;
}

/**
 * Rows strictly older than where the last page ended.
 *
 * Keyset rather than offset: an offset counts rows the database has already
 * discarded, so page fifty reads fifty pages to return one, and a run started
 * while somebody reads shifts every page after it. A cursor names a position,
 * so it costs the same at page fifty as at page one and cannot skip a row.
 *
 * The id breaks the tie on the timestamp. Two runs started in the same
 * millisecond are ordered by nothing otherwise, and a cursor that cannot tell
 * them apart repeats one of them or loses it.
 */
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
  /* Counted rather than kept in memory, because a run this process did not
     start -- dispatched to a worker, or started on another server -- still
     holds sandboxes against the same organisation and the same accounts. */
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
