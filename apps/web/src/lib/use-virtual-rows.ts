import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useState } from "react";

const OVERSCAN = 8;

const scrollParentOf = (element: HTMLElement) => {
  for (
    let parent = element.parentElement;
    parent !== null;
    parent = parent.parentElement
  ) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") {
      return parent;
    }
  }
  return document.documentElement;
};

interface ScrollFrame {
  readonly element: HTMLElement;
  readonly margin: number;
}

export function useVirtualRows<List extends HTMLElement>({
  count,
  pinned,
  rowHeight,
}: {
  readonly count: number;
  readonly pinned: Iterable<number>;
  readonly rowHeight: number;
}) {
  const [list, listRef] = useState<List | null>(null);
  const [frame, setFrame] = useState<ScrollFrame | null>(null);

  useLayoutEffect(() => {
    if (list === null) {
      return;
    }
    const element = scrollParentOf(list);
    const measure = () => {
      const margin =
        list.getBoundingClientRect().top -
        element.getBoundingClientRect().top +
        element.scrollTop;
      setFrame((current) =>
        current?.element === element && current.margin === margin
          ? current
          : { element, margin }
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element.firstElementChild ?? element);
    return () => observer.disconnect();
  }, [list]);

  const margin = frame?.margin ?? 0;
  const virtualizer = useVirtualizer({
    count,
    estimateSize: () => rowHeight,
    getScrollElement: () => frame?.element ?? null,
    overscan: OVERSCAN,
    rangeExtractor: (range) =>
      [
        ...new Set([
          ...defaultRangeExtractor(range),
          ...[...pinned].filter((index) => index < count),
        ]),
      ].sort((left, right) => left - right),
    scrollMargin: margin,
    useFlushSync: false,
  });

  return {
    height: virtualizer.getTotalSize(),
    listRef,
    measureRow: virtualizer.measureElement,
    rows: virtualizer
      .getVirtualItems()
      .map((row) => ({ index: row.index, offset: row.start - margin })),
  };
}
