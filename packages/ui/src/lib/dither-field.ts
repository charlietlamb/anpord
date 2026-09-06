import { bayerMatrix } from "./bayer-dither";

const MATRIX_ORDER = 3;
const TWO_PI = Math.PI * 2;

/* Directions are off-axis and mutually irrational, so crests never line up
   into stripes. */
const WAVES = [
  { amplitude: 0.5, dx: 0.9, dy: 0.31, phase: 0, speed: 0.05 },
  { amplitude: 0.32, dx: -0.53, dy: 0.77, phase: 2.1, speed: -0.031 },
  { amplitude: 0.24, dx: 0.37, dy: -0.61, phase: 4.3, speed: 0.019 },
] as const;

/** The heading turns slowly, which stops the drift reading as a slide. */
const DRIFT = { radius: 0.09, turn: 0.013 } as const;

/** An ordered threshold degenerates into a checkerboard at the midpoint, so
 * the field is steepened to leave only a narrow band there. */
const CONTRAST = 1.9;

/* A second, unrelated field deciding where dither is allowed at all. */
const MASK_WAVES = [
  { amplitude: 0.62, dx: 0.23, dy: 0.17, phase: 1.7, speed: 0.011 },
  { amplitude: 0.38, dx: -0.14, dy: 0.29, phase: 3.9, speed: -0.007 },
  { amplitude: 0.7, dx: 0.71, dy: 0.38, phase: 0.6, speed: 0.017 },
] as const;

/** Derived, so the field still normalises when a wave above is retuned. */
const MASK_SUM = MASK_WAVES.reduce((total, wave) => total + wave.amplitude, 0);

/** Raising the field to a power collapses the mid-range, keeping pockets
 * separate instead of merging whenever the waves align. */
const MASK_FALLOFF = 2.5;

/** The gap between the two is the pocket's edge, which frays rather than cuts. */
const MASK_FLOOR = 0.33;
const MASK_CEILING = 0.6;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

interface Wave {
  readonly amplitude: number;
  readonly dx: number;
  readonly dy: number;
  readonly phase: number;
  readonly speed: number;
}

/** `sin(ax + by + c)` expands to `sin(ax)cos(by + c) + cos(ax)sin(by + c)`,
 * whose halves are constant across a column and a row, so each is computed once
 * per column or row rather than once per cell. */
const writeRowTerms = (
  waves: readonly Wave[],
  y: number,
  time: number,
  into: Scratch
) => {
  for (let index = 0; index < waves.length; index++) {
    const wave = waves[index];
    const angle = TWO_PI * (wave.dy * y + wave.speed * time) + wave.phase;
    into.sines[index] = Math.sin(angle);
    into.cosines[index] = Math.cos(angle);
  }
};

const writeColumnTerms = (
  waves: readonly Wave[],
  x: number,
  into: Scratch,
  offset: number
) => {
  for (let index = 0; index < waves.length; index++) {
    const angle = TWO_PI * waves[index].dx * x;
    into.sines[offset + index] = Math.sin(angle);
    into.cosines[offset + index] = Math.cos(angle);
  }
};

const combine = (
  waves: readonly Wave[],
  row: { cosines: Float64Array; sines: Float64Array },
  column: { cosines: Float64Array; sines: Float64Array },
  offset: number
) => {
  let sum = 0;
  for (let index = 0; index < waves.length; index++) {
    const at = offset + index;
    sum +=
      waves[index].amplitude *
      (column.sines[at] * row.cosines[index] +
        column.cosines[at] * row.sines[index]);
  }
  return sum;
};

const pocketOf = (sum: number) => {
  const level = clamp((sum / MASK_SUM) * 0.5 + 0.5);
  return clamp(
    (level ** MASK_FALLOFF - MASK_FLOOR) / (MASK_CEILING - MASK_FLOOR)
  );
};

const toneOf = (sum: number) => clamp((sum / 1.06) * CONTRAST + 0.5);

/** Flattened so the inner loop indexes a typed array, not nested objects. */
const thresholds = (() => {
  const matrix = bayerMatrix(MATRIX_ORDER);
  const size = matrix.length;
  const flat = new Uint8Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      flat[y * size + x] = matrix[y][x];
    }
  }

  return { flat, levels: size * size, size };
})();

interface Scratch {
  cosines: Float64Array;
  sines: Float64Array;
}

const maskScratch: Scratch = {
  cosines: new Float64Array(0),
  sines: new Float64Array(0),
};
const toneScratch: Scratch = {
  cosines: new Float64Array(0),
  sines: new Float64Array(0),
};
const maskRowScratch: Scratch = {
  cosines: new Float64Array(0),
  sines: new Float64Array(0),
};
const toneRowScratch: Scratch = {
  cosines: new Float64Array(0),
  sines: new Float64Array(0),
};

/** Kept between frames; per-frame allocation is work the collector must undo. */
const scratch = (held: Scratch, columns: number, waves: number) => {
  const needed = columns * waves;

  if (held.sines.length < needed) {
    held.sines = new Float64Array(needed);
    held.cosines = new Float64Array(needed);
  }

  return held;
};

/** Writes into the caller's mask: an object per lit cell cost more to collect
 * than the field costs to compute. */
export const ditherField = (
  mask: Uint8Array,
  columns: number,
  rows: number,
  time: number
) => {
  const { flat, levels, size } = thresholds;
  const aspect = columns / Math.max(1, rows);
  const heading = time * DRIFT.turn;
  const driftX = Math.cos(heading) * DRIFT.radius * time;
  const driftY = Math.sin(heading) * DRIFT.radius * time;

  mask.fill(0);

  /* Held apart: the mask reads the undrifted column, the tone the drifted one. */
  const maskColumns = scratch(maskScratch, columns, MASK_WAVES.length);
  const toneColumns = scratch(toneScratch, columns, WAVES.length);

  for (let column = 0; column < columns; column++) {
    const x = (column / columns) * aspect;
    writeColumnTerms(MASK_WAVES, x, maskColumns, column * MASK_WAVES.length);
    writeColumnTerms(WAVES, x + driftX, toneColumns, column * WAVES.length);
  }

  const maskRow = scratch(maskRowScratch, 1, MASK_WAVES.length);
  const toneRow = scratch(toneRowScratch, 1, WAVES.length);

  for (let row = 0; row < rows; row++) {
    const y = row / rows;
    const rowOffset = row * columns;
    const thresholdRow = (row % size) * size;
    writeRowTerms(MASK_WAVES, y, time, maskRow);
    writeRowTerms(WAVES, y + driftY, time, toneRow);

    for (let column = 0; column < columns; column++) {
      const x = column / columns;
      const corner = clamp(
        1 - 1.8 * Math.min(x * x + y * y, (1 - x) ** 2 + (1 - y) ** 2)
      );
      const pocket = clamp(
        pocketOf(
          combine(MASK_WAVES, maskRow, maskColumns, column * MASK_WAVES.length)
        ) *
          0.45 +
          corner -
          0.55
      );
      if (pocket === 0) {
        continue;
      }

      /* Scales rather than clips, so dots thin out instead of ending on a line. */
      const tone = toneOf(
        combine(WAVES, toneRow, toneColumns, column * WAVES.length)
      );
      const value = (0.25 + tone * 0.75) * pocket;

      if (flat[thresholdRow + (column % size)] < value * levels) {
        mask[rowOffset + column] = 1;
      }
    }
  }
};
