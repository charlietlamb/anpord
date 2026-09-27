import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useState } from "react";

const OVERSCAN = 8;
const FIRST_WINDOW = { height: 1080, width: 0 };

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

const exactHeight = (
  element: Element,
  entry: ResizeObserverEntry | undefined
) =>
  entry?.borderBoxSize[0]?.blockSize ?? element.getBoundingClientRect().height;

interface ScrollFrame {
  readonly element: HTMLElement;
  readonly margin: number;
}

export function useVirtualRows<List extends HTMLElement>({
  count,
  gap = 0,
  inset = 0,
  pinned,
  rowHeight,
}: {
  readonly count: number;
  readonly gap?: number;
  readonly inset?: number;
  readonly pinned: Iterable<number>;
  readonly rowHeight: number | ((index: number) => number);
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
    estimateSize: typeof rowHeight === "number" ? () => rowHeight : rowHeight,
    gap,
    measureElement: exactHeight,
    getScrollElement: () => frame?.element ?? null,
    initialRect: FIRST_WINDOW,
    overscan: OVERSCAN,
    paddingEnd: inset,
    paddingStart: inset,
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
