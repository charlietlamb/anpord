import { type KeyboardEvent, useEffect, useRef, useState } from "react";

/** Which key moves where, so the handler reads as a table rather than as a
 * chain of comparisons. `end` is resolved against the count by the caller. */
const MOVES: Record<string, (at: number, last: number) => number> = {
  ArrowDown: (at, last) => Math.min(at + 1, last),
  ArrowUp: (at) => Math.max(at - 1, 0),
  End: (_at, last) => last,
  Home: () => 0,
};

interface ListKeyboardNav {
  readonly activeIndex: number;
  /** Set on the element wrapping the rows. */
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly registerRow: (index: number) => (node: HTMLElement | null) => void;
  /** Rows call this so pointing at one and then using the keyboard carries on
   * from where the pointer was, rather than from where the keyboard last was. */
  readonly setActiveIndex: (index: number) => void;
}

/**
 * Arrow-key movement across a list, with focus following the selection.
 *
 * Only the active row is reachable by Tab: a list of two hundred prompts that
 * puts every one of them in the tab order makes the keyboard the slowest way
 * through the page rather than the fastest.
 */
export function useListKeyboardNav(count: number): ListKeyboardNav {
  const [requested, setRequested] = useState(0);
  const rows = useRef<(HTMLElement | null)[]>([]);
  /** Focus belongs to the row only once a key has asked for it; moving it on
   * first render would steal it from whatever the reader was already using. */
  const moved = useRef(false);

  /* Clamped as it is read rather than corrected after the fact: a list that
     shrinks under the selection — a search narrowing it — would otherwise
     point past its own end for the render that discovers it. */
  const activeIndex = Math.min(requested, Math.max(count - 1, 0));

  useEffect(() => {
    if (moved.current) {
      rows.current[activeIndex]?.focus();
    }
  }, [activeIndex]);

  return {
    activeIndex,
    onKeyDown: (event) => {
      const move = MOVES[event.key];
      if (!move || count === 0) {
        return;
      }
      event.preventDefault();
      moved.current = true;
      setRequested(move(activeIndex, count - 1));
    },
    registerRow: (index) => (node) => {
      rows.current[index] = node;
    },
    setActiveIndex: setRequested,
  };
}
