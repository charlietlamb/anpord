import type { Palette } from "./paint";

const LABEL_WIDTH = 9;

export const labelled = (label: string, value: string, paint: Palette) =>
  `  ${paint.dim(label.padEnd(LABEL_WIDTH))}${value}`;

export const continued = (value: string) =>
  `  ${" ".repeat(LABEL_WIDTH)}${value}`;
