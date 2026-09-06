/* A Bayer threshold map, built by recursively expanding this 2x2 seed so the
   tile repeats without a visible seam. */
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

/** Tone runs 0 (empty tile) to 1 (full). */
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
