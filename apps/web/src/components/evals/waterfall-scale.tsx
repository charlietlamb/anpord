/* The axis, the gridlines and every row share this gutter, so a tick and the
   bar beneath it stand at the same instant. */
export const LABEL_WIDTH = "20rem";

export const TICKS = 4;

export const FRACTIONS = Array.from(
  { length: TICKS + 1 },
  (_, index) => index / TICKS
);
