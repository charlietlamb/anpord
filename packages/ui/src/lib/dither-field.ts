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
  { amplitude: 0.7, dx: 0.71, dy: 0.38, phase: 0.6, speed: 0.017 },
] as const;

/** Derived rather than written down, so the field keeps normalising to itself
 * when a wave above is retuned. */
const MASK_SUM = MASK_WAVES.reduce((total, wave) => total + wave.amplitude, 0);

/** Raising the field to a power isolates its peaks: the mid-range collapses
 * toward nothing, so pockets stay separate instead of merging into one mass
 * whenever the waves happen to align. */
const MASK_FALLOFF = 2;

/** Above this the pocket is solid, below it nothing draws. The gap between the
 * two is the pocket's edge, which frays rather than cutting. */
const MASK_FLOOR = 0.16;
const MASK_CEILING = 0.55;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

interface Wave {
  readonly amplitude: number;
  readonly dx: number;
  readonly dy: number;
  readonly phase: number;
  readonly speed: number;
}

/**
 * A wave is `sin(ax + by + c)`, which expands to
 * `sin(ax)cos(by + c) + cos(ax)sin(by + c)`. The second half is constant across
 * a row and the first across a column, so each is computed once per row or
 * column instead of once per cell: a full screen goes from millions of trig
 * calls to a few thousand.
 */
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

/** The threshold map flattened once, so the inner loop indexes a typed array
 * rather than walking two levels of object. */
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

/** Grown to fit and then kept. The field runs several times a second, and
 * allocating a pair of arrays per frame is work the collector has to undo. */
const scratch = (held: Scratch, columns: number, waves: number) => {
  const needed = columns * waves;

  if (held.sines.length < needed) {
    held.sines = new Float64Array(needed);
    held.cosines = new Float64Array(needed);
  }

  return held;
};

/**
 * Writes which cells are lit into the caller's mask rather than returning a
 * list of them. A full screen is hundreds of thousands of cells, and allocating
 * an object per lit one made the field cost more to collect than to compute.
 */
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

  /* Both fields' column terms, built once for the frame and kept between them.
     The mask reads the undrifted column and the tone the drifted one, so they
     are held apart. */
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
      const pocket = pocketOf(
        combine(MASK_WAVES, maskRow, maskColumns, column * MASK_WAVES.length)
      );
      if (pocket === 0) {
        continue;
      }

      /* The pocket scales the tone rather than clipping it, so a dot thins out
         toward the edge instead of the pocket ending on a hard line. */
      const value =
        toneOf(combine(WAVES, toneRow, toneColumns, column * WAVES.length)) *
        pocket;

      if (flat[thresholdRow + (column % size)] < value * levels) {
        mask[rowOffset + column] = 1;
      }
    }
  }
};
