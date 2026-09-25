const TICKS = 4;

/* Ticks land on round times rather than arbitrary fractions of the span. */
const STEPS_MS = [
  100, 250, 500, 1000, 2000, 5000, 10_000, 15_000, 30_000, 60_000, 120_000,
  300_000, 600_000,
];

const SMALLEST = STEPS_MS[0] ?? 100;

/* Closest to TICKS intervals, so the axis stays about as busy at every scale. */
const stepFor = (spanMs: number) => {
  let best = SMALLEST;
  let closest = Number.POSITIVE_INFINITY;

  for (const step of STEPS_MS) {
    const count = Math.floor(spanMs / step);
    const distance = Math.abs(count - TICKS);

    if (count >= 1 && distance < closest) {
      closest = distance;
      best = step;
    }
  }

  return best;
};

export interface WaterfallTick {
  readonly atMs: number;
  readonly fraction: number;
}

/* Each tick sits where its own time falls, so the axis never overstates. */
export const ticksFor = (spanMs: number): readonly WaterfallTick[] => {
  const step = stepFor(spanMs);
  const count = Math.max(Math.floor(spanMs / step), 1);

  return Array.from({ length: count + 1 }, (_, index) => index * step).map(
    (atMs) => ({ atMs, fraction: spanMs === 0 ? 0 : atMs / spanMs })
  );
};

export const BAR = "h-4 rounded-[4px]";

export const TIMELINE_COLUMNS = "minmax(0,5fr) minmax(0,9fr)";
