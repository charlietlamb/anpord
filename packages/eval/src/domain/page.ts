import { EVAL_PAGE_SIZE } from "@anpord/schema/domain/evals";
import { Schema } from "effect";

/* Ten rows, which is a page a reader takes in at once rather than one they
   scan. A failed row carries a reason and a run carries its variants, so a
   longer page stops fitting on a screen and starts needing one.

   Taken from the schema rather than written twice: a reader turns a total
   into a number of pages by dividing by this, and two copies that disagree
   would report a page count the listing does not have. */
export const DEFAULT_PAGE_SIZE = EVAL_PAGE_SIZE;
export const MAX_PAGE_SIZE = 100;

/**
 * Where a listing left off.
 *
 * A timestamp alone is not a position: two runs started in the same
 * millisecond share it, and a cursor that cannot tell them apart either
 * repeats a row or skips one. The id breaks the tie, and the pair is ordered
 * by the same rule the query orders by.
 */
export const PageCursor = Schema.Struct({
  id: Schema.String,
  startedAtMillis: Schema.Int,
});
export type PageCursor = typeof PageCursor.Type;

/**
 * One page of a listing, and where the next one starts.
 *
 * `next` is null at the end rather than an empty cursor, so a caller stops
 * because there is nothing more rather than because a fetch came back empty.
 */
export const pageOf = <A>(items: readonly A[], size: number) => {
  const hasMore = items.length > size;

  return { hasMore, items: hasMore ? items.slice(0, size) : items };
};

/* Read from a caller rather than trusted: a request asking for ten thousand
   rows is a request to hold ten thousand rows in memory. */
export const pageSizeOf = (requested: number | undefined) =>
  requested === undefined
    ? DEFAULT_PAGE_SIZE
    : Math.min(Math.max(requested, 1), MAX_PAGE_SIZE);
