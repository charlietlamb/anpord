import { useCallback, useState } from "react";
import type { CursorStack } from "@/lib/cursor-stack";
import {
  cursorOf,
  firstPage,
  pageOf,
  popped,
  pushed,
} from "@/lib/cursor-stack";

interface CursorPages<A> {
  readonly page: number;
  readonly pop: () => void;
  readonly push: (next: A) => void;
}

export const pagingOf = <A>(
  pages: CursorPages<A>,
  next: A | null,
  disabled: boolean
) => ({
  canGoNext: next !== null,
  canGoPrev: pages.page > 1,
  disabled,
  onNext: () => {
    if (next !== null) {
      pages.push(next);
    }
  },
  onPrev: pages.pop,
  page: pages.page,
});

export function useCursorStack<A>() {
  const [stack, setStack] = useState<CursorStack<A>>(firstPage<A>);

  return {
    cursor: cursorOf(stack),
    page: pageOf(stack),
    pop: useCallback(() => setStack(popped), []),
    push: useCallback((next: A) => setStack((seen) => pushed(seen, next)), []),
    reset: useCallback(() => setStack(firstPage<A>()), []),
  };
}
