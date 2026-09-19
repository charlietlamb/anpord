/* Axis, gridlines and rows share this gutter so ticks line up with bars. */
export const LABEL_WIDTH = "20rem";

export const TICKS = 4;

export const FRACTIONS = Array.from(
  { length: TICKS + 1 },
  (_, index) => index / TICKS
);
