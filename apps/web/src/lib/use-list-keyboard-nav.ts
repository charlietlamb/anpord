import { type KeyboardEvent, useEffect, useRef, useState } from "react";

const MOVES: Record<string, (at: number, last: number) => number> = {
  ArrowDown: (at, last) => Math.min(at + 1, last),
  ArrowUp: (at) => Math.max(at - 1, 0),
  End: (_at, last) => last,
  Home: () => 0,
};

interface ListKeyboardNav {
  readonly activeIndex: number;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly registerRow: (index: number) => (node: HTMLElement | null) => void;
  readonly setActiveIndex: (index: number) => void;
}

/* Only the active row is reachable by Tab, so a long list does not flood the tab order. */
export function useListKeyboardNav(count: number): ListKeyboardNav {
  const [requested, setRequested] = useState(0);
  const rows = useRef<(HTMLElement | null)[]>([]);
  /* Focus moves only once a key has asked for it, so first render does not steal it. */
  const moved = useRef(false);

  /* Clamped on read: a list shrinking under the selection would otherwise point past its end for one render. */
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
