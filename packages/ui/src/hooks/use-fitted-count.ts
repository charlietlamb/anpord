"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * How many of a row's children fit on one line.
 *
 * Measured rather than assumed, because the answer depends on what the labels
 * say: three sandbox names fit where two model names do not, and a fixed count
 * would either clip the short case or wrap the long one. Children are laid out
 * normally and read back, so the measurement is of the real thing.
 *
 * The counter that stands in for the remainder takes room of its own, so it is
 * measured too and the last chip yields to it rather than being overlapped.
 */
export function useFittedCount(total: number) {
  const rowRef = useRef<HTMLElement | null>(null);
  const overflowRef = useRef<HTMLElement | null>(null);
  const [fitted, setFitted] = useState(total);

  const measure = useCallback(() => {
    const row = rowRef.current;

    if (row === null) {
      setFitted(total);
      return;
    }

    const chips = Array.from(row.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child !== overflowRef.current
    );

    if (chips.length === 0) {
      setFitted(total);
      return;
    }

    const available = row.clientWidth;
    const counter = overflowRef.current?.offsetWidth ?? 0;
    const gap = Number.parseFloat(getComputedStyle(row).columnGap) || 0;

    let used = 0;
    let count = 0;

    for (const chip of chips) {
      const next = used + (count === 0 ? 0 : gap) + chip.offsetWidth;
      const remaining = count + 1 < chips.length ? gap + counter : 0;

      if (next + remaining > available) {
        break;
      }

      used = next;
      count += 1;
    }

    setFitted(Math.max(count, 1));
  }, [total]);

  useLayoutEffect(() => {
    measure();

    const row = rowRef.current;

    if (row === null || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(measure);

    observer.observe(row);

    return () => observer.disconnect();
  }, [measure]);

  return { fitted, overflowRef, rowRef };
}
