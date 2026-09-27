import type { Paint, Palette } from "./paint";

const GLYPHS: Readonly<Record<string, string>> = {
  failed: "✗",
  passed: "✓",
  "timed out": "○",
  void: "○",
};

export const outcomeTone = (status: string, paint: Palette): Paint => {
  if (status === "passed") {
    return paint.green;
  }

  if (status === "failed") {
    return paint.red;
  }

  return status in GLYPHS ? paint.yellow : paint.dim;
};

export const outcomeGlyph = (status: string, paint: Palette) =>
  outcomeTone(status, paint)(GLYPHS[status] ?? "·");

export const outcomeMark = (status: string, paint: Palette) =>
  outcomeTone(
    status,
    paint
  )(status in GLYPHS ? `${GLYPHS[status]} ${status}` : status);
