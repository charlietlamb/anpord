import { useCallback, useState } from "react";
import type { CursorStack } from "@/lib/cursor-stack";
import {
  cursorOf,
  firstPage,
  pageOf,
  popped,
  pushed,
} from "@/lib/cursor-stack";

/** The cursor stack as a listing holds it: where it is, and how to move. */
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
