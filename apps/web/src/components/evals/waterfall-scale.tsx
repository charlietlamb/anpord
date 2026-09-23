export const TICKS = 4;

export const FRACTIONS = Array.from(
  { length: TICKS + 1 },
  (_, index) => index / TICKS
);

export const BAR = "h-4 rounded-[4px]";

export const TIMELINE_COLUMNS = "minmax(0,5fr) minmax(0,9fr)";
