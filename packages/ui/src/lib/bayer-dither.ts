/**
 * Ordered dithering renders a continuous tone as a fixed pattern of dots by
 * comparing each cell against a threshold map. The map is a Bayer matrix, built
 * by recursively expanding a 2x2 seed so that thresholds are spread as evenly
 * as possible and the tile repeats without a visible seam.
 */
const SEED = [
  [0, 2],
  [3, 1],
];

const expand = (matrix: readonly (readonly number[])[]) => {
  const size = matrix.length;
  const next: number[][] = Array.from({ length: size * 2 }, () =>
    Array.from({ length: size * 2 }, () => 0)
  );

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const base = matrix[y][x] * 4;
      next[y][x] = base + SEED[0][0];
      next[y][x + size] = base + SEED[0][1];
      next[y + size][x] = base + SEED[1][0];
      next[y + size][x + size] = base + SEED[1][1];
    }
  }

  return next;
};

export const bayerMatrix = (order: number) => {
  let matrix: readonly (readonly number[])[] = SEED;
  for (let step = 1; step < order; step++) {
    matrix = expand(matrix);
  }
  return matrix;
};

export interface DitherCell {
  readonly x: number;
  readonly y: number;
}

/**
 * The cells whose threshold falls under the given tone, which is what turns a
 * brightness into a pattern. A tone of 0 leaves the tile empty and a tone of 1
 * fills it, so the caller controls density with a single number.
 */
export const ditherCells = (order: number, tone: number): DitherCell[] => {
  const matrix = bayerMatrix(order);
  const size = matrix.length;
  const levels = size * size;
  const cutoff = Math.round(tone * levels);
  const cells: DitherCell[] = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix[y][x] < cutoff) {
        cells.push({ x, y });
      }
    }
  }

  return cells;
};
