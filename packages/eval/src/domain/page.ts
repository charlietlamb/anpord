import { EVAL_PAGE_SIZE } from "@anpord/schema/domain/evals";
import { Schema } from "effect";

/* Taken from the schema, never written twice: a reader divides a total by this
   to get a page count, and two copies that disagree would report a wrong one. */
export const DEFAULT_PAGE_SIZE = EVAL_PAGE_SIZE;
export const MAX_PAGE_SIZE = 100;

/* The id breaks ties: two runs started in the same millisecond share a timestamp. */
export const PageCursor = Schema.Struct({
  id: Schema.String,
  startedAtMillis: Schema.Int,
});
export type PageCursor = typeof PageCursor.Type;

/* `next` is null at the end, never an empty cursor. */
export const pageOf = <A>(items: readonly A[], size: number) => {
  const hasMore = items.length > size;

  return { hasMore, items: hasMore ? items.slice(0, size) : items };
};

/* Clamped: an unbounded page size is a request to hold that many rows in memory. */
export const pageSizeOf = (requested: number | undefined) =>
  requested === undefined
    ? DEFAULT_PAGE_SIZE
    : Math.min(Math.max(requested, 1), MAX_PAGE_SIZE);
