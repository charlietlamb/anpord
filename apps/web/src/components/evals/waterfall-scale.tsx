/* Axis, gridlines and rows share this gutter so ticks line up with bars. */
export const LABEL_WIDTH = "20rem";

export const TICKS = 4;

export const FRACTIONS = Array.from(
  { length: TICKS + 1 },
  (_, index) => index / TICKS
);

/* Square ends say where a step began and ended; a pill rounds that away. */
export const BAR = "h-2.5 rounded-[2px]";

/* One row of the chart, label gutter included. */
export const WATERFALL_ROW = "h-7";
