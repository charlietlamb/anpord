const SERIES = [
  "var(--trace-message)",
  "var(--trace-file)",
  "var(--trace-thinking)",
  "var(--trace-command)",
  "var(--trace-said)",
];

export const seriesColor = (index: number) => SERIES[index % SERIES.length];
