import {
  EVAL_PAGE_SIZE,
  type EvalPageCursor,
} from "@anpord/schema/domain/evals";

export const MAX_PAGE_SIZE = 100;

export const pageOf = <A>(items: readonly A[], size: number) => {
  const hasMore = items.length > size;
  return { hasMore, items: hasMore ? items.slice(0, size) : items };
};

export const pageSizeOf = (requested: number | undefined) =>
  requested === undefined
    ? EVAL_PAGE_SIZE
    : Math.min(Math.max(requested, 1), MAX_PAGE_SIZE);

export const nextCursor = <A>(
  page: { readonly hasMore: boolean; readonly items: readonly A[] },
  cursorOf: (last: A) => EvalPageCursor
): EvalPageCursor | null => {
  const last = page.items.at(-1);
  return page.hasMore && last !== undefined ? cursorOf(last) : null;
};
