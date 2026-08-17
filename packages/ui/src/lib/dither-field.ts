import { bayerMatrix } from "./bayer-dither";

const MATRIX_ORDER = 3;
const TWO_PI = Math.PI * 2;

/**
 * Low spatial frequencies, so a whole region shares a tone and the dither
 * describes a shape. Directions are off-axis and mutually irrational, which
 * keeps the crests from lining up into stripes.
 */
const WAVES = [
  { amplitude: 0.5, dx: 0.9, dy: 0.31, phase: 0, speed: 0.05 },
  { amplitude: 0.32, dx: -0.53, dy: 0.77, phase: 2.1, speed: -0.031 },
  { amplitude: 0.24, dx: 0.37, dy: -0.61, phase: 4.3, speed: 0.019 },
] as const;

/** The whole field slides along one heading while the waves beat against each
 * other, so it looks like it is going somewhere rather than merely churning.
 * The heading turns slowly, which is what stops the drift reading as a slide. */
const DRIFT = { radius: 0.09, turn: 0.013 } as const;

/** Steepens the field so most of it sits at an extreme. An ordered threshold
 * degenerates into a checkerboard at the midpoint, so only a narrow band is
 * left there and the eye reads the masses instead of the weave. */
const CONTRAST = 1.9;

/**
 * A second field, slower than the first and unrelated to it, deciding where
 * dither is allowed at all. Without it the waves cover the page evenly; with it
 * the texture gathers into pockets and leaves the space between them clear.
 */
const MASK_WAVES = [
  { amplitude: 0.62, dx: 0.23, dy: 0.17, phase: 1.7, speed: 0.011 },
  { amplitude: 0.38, dx: -0.14, dy: 0.29, phase: 3.9, speed: -0.007 },
] as const;

/** Above this the pocket is solid, below it nothing draws. The gap between the
 * two is the pocket's edge, which frays rather than cutting. */
const MASK_FLOOR = 0.34;
const MASK_CEILING = 0.72;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

const coverage = (x: number, y: number, time: number) => {
  let sum = 0;
  for (const wave of MASK_WAVES) {
    sum +=
      wave.amplitude *
      Math.sin(
        TWO_PI * (wave.dx * x + wave.dy * y + wave.speed * time) + wave.phase
      );
  }
  const level = sum / 1 + 0.5;
  return clamp((level - MASK_FLOOR) / (MASK_CEILING - MASK_FLOOR));
};

const tone = (x: number, y: number, time: number) => {
  const heading = time * DRIFT.turn;
  const driftX = x + Math.cos(heading) * DRIFT.radius * time;
  const driftY = y + Math.sin(heading) * DRIFT.radius * time;

  let sum = 0;
  for (const wave of WAVES) {
    sum +=
      wave.amplitude *
      Math.sin(
        TWO_PI * (wave.dx * driftX + wave.dy * driftY + wave.speed * time) +
          wave.phase
      );
  }
  return clamp((sum / 1.06) * CONTRAST + 0.5);
};

export interface FieldCell {
  readonly column: number;
  readonly row: number;
}

export const ditherField = (
  columns: number,
  rows: number,
  time: number
): FieldCell[] => {
  const matrix = bayerMatrix(MATRIX_ORDER);
  const size = matrix.length;
  const levels = size * size;
  const cells: FieldCell[] = [];
  const aspect = columns / Math.max(1, rows);

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = (column / columns) * aspect;
      const y = row / rows;
      const pocket = coverage(x, y, time);
      if (pocket === 0) {
        continue;
      }

      /* The pocket scales the tone rather than clipping it, so a dot thins out
         toward the edge instead of the pocket ending on a hard line. */
      const value = tone(x, y, time) * pocket;
      if (matrix[row % size][column % size] < value * levels) {
        cells.push({ column, row });
      }
    }
  }

  return cells;
};
