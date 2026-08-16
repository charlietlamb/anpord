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

const clamp = (value: number) => Math.min(1, Math.max(0, value));

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
      const value = tone((column / columns) * aspect, row / rows, time);
      if (matrix[row % size][column % size] < value * levels) {
        cells.push({ column, row });
      }
    }
  }

  return cells;
};
