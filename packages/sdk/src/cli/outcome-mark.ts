import type { Palette } from "./paint";

export const outcomeMark = (status: string, paint: Palette) => {
  if (status === "passed") {
    return paint.green(`✓ ${status}`);
  }

  if (status === "failed") {
    return paint.red(`✗ ${status}`);
  }

  return status === "void" || status === "timed out"
    ? paint.yellow(`○ ${status}`)
    : paint.dim(status);
};
