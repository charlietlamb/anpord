import type { DitheringProps } from "@paper-design/shaders-react";

type DitheringShape = NonNullable<DitheringProps["shape"]>;
type DitheringType = NonNullable<DitheringProps["type"]>;

export interface DitherClumps {
  readonly cut?: number;
  readonly edge?: number;
  readonly frequency: number;
  readonly octaves?: number;
  readonly seed: number;
}

export interface DitherLayer {
  readonly clumps?: DitherClumps;
  readonly mask: string;
  readonly opacity?: number;
  readonly rotation?: number;
  readonly scale: number;
  readonly shape: DitheringShape;
  readonly size?: number;
  readonly speed: number;
  readonly type?: DitheringType;
}

export interface DitherPreset {
  readonly id: string;
  readonly layers: readonly DitherLayer[];
  readonly name: string;
  readonly opacity: number;
}

export interface DitherFamily {
  readonly description: string;
  readonly name: string;
  readonly presets: readonly DitherPreset[];
}

type LayerOptions = Partial<Omit<DitherLayer, "mask">>;

const glow = (x: number, y: number, width: number, height: number, fade = 75) =>
  `radial-gradient(ellipse ${width}% ${height}% at ${x}% ${y}%, black, transparent ${fade}%)`;

const beam = (angle: number, from: number, to: number) =>
  `linear-gradient(${angle}deg, black ${from}%, transparent ${to}%)`;

const layer = (mask: string, options: LayerOptions = {}): DitherLayer => ({
  mask,
  scale: 0.7,
  shape: "warp",
  speed: 0.12,
  ...options,
});

const preset = (
  id: string,
  name: string,
  opacity: number,
  layers: readonly DitherLayer[]
): DitherPreset => ({ id, layers, name, opacity });

export const CURRENT_DITHER = preset("current", "Current", 0.13, [
  layer(beam(135, 0, 95), {
    clumps: { cut: 0.5, frequency: 0.004, seed: 5 },
    scale: 0.5,
    size: 4,
  }),
]);

const STREAMS: DitherFamily = {
  description:
    "The diagonal sweep with its streaks turned to run along the flow.",
  name: "Streams",
  presets: [
    preset("streams-origin", "Diagonal sweep, as picked", 0.15, [
      layer(beam(135, 0, 40)),
      layer(beam(135, 10, 75), { clumps: { frequency: 0.008, seed: 3 } }),
    ]),
    preset("streams-aligned", "Aligned streaks", 0.15, [
      layer(beam(135, 0, 42), { rotation: 45, scale: 0.6 }),
      layer(beam(135, 8, 80), {
        clumps: { frequency: 0.008, seed: 3 },
        rotation: 45,
        scale: 0.6,
      }),
    ]),
    preset("streams-fine", "Fine current", 0.16, [
      layer(beam(150, 0, 35), { rotation: 45, scale: 1, size: 2, speed: 0.18 }),
      layer(beam(150, 5, 80), {
        clumps: { frequency: 0.012, seed: 14 },
        rotation: 45,
        scale: 1,
        size: 2,
        speed: 0.18,
      }),
    ]),
    preset("streams-river", "Wide river", 0.13, [
      layer(beam(135, 0, 50), { rotation: 30, scale: 0.45, size: 4 }),
      layer(beam(135, 10, 92), {
        clumps: { cut: 0.55, frequency: 0.005, seed: 8 },
        rotation: 30,
        scale: 0.45,
        size: 4,
      }),
    ]),
    preset("streams-shallow-bayer", "Shallow, 8x8 grain", 0.15, [
      layer(beam(115, 0, 32), { rotation: 60, type: "8x8" }),
      layer(beam(115, 6, 72), {
        clumps: { frequency: 0.009, seed: 5 },
        rotation: 60,
        type: "8x8",
      }),
    ]),
    preset("streams-wave", "Wave streams", 0.14, [
      layer(beam(135, 0, 45), {
        rotation: 45,
        scale: 0.8,
        shape: "wave",
        speed: 0.07,
      }),
      layer(beam(135, 10, 78), {
        clumps: { frequency: 0.009, seed: 19 },
        rotation: 45,
      }),
    ]),
    preset("streams-confluence", "Two corners meeting", 0.14, [
      layer(beam(135, 0, 34), { rotation: 45, scale: 0.6 }),
      layer(beam(315, 0, 26), { rotation: 45, scale: 0.6, speed: 0.09 }),
      layer(beam(135, 10, 90), {
        clumps: { cut: 0.62, frequency: 0.009, seed: 27 },
        rotation: 45,
        scale: 0.6,
      }),
    ]),
    preset("streams-grain", "Grain current", 0.16, [
      layer(beam(135, 0, 40), {
        rotation: 45,
        scale: 0.8,
        size: 2,
        speed: 0.2,
        type: "random",
      }),
      layer(beam(135, 8, 80), {
        clumps: { edge: 24, frequency: 0.01, seed: 31 },
        rotation: 45,
        scale: 0.8,
        size: 2,
        speed: 0.2,
        type: "random",
      }),
    ]),
  ],
};

const NEBULA: DitherFamily = {
  description: "Big soft clouds in heavy dots, sparse and halftone-like.",
  name: "Nebula",
  presets: [
    preset("nebula-halftone", "Halftone cloud", 0.14, [
      layer(
        `${glow(8, 15, 40, 40)}, ${glow(32, 4, 30, 25)}, ${glow(4, 62, 25, 30)}`,
        {
          scale: 0.4,
          shape: "simplex",
          size: 5,
          speed: 0.08,
        }
      ),
    ]),
    preset("nebula-bayer", "Bayer cloud", 0.14, [
      layer(`${glow(6, 18, 45, 45)}, ${glow(88, 8, 30, 25)}`, {
        scale: 0.35,
        shape: "simplex",
        size: 6,
        speed: 0.06,
        type: "8x8",
      }),
    ]),
    preset("nebula-coarse", "Coarse and sparse", 0.12, [
      layer(beam(135, 0, 60), {
        scale: 0.3,
        shape: "simplex",
        size: 8,
        speed: 0.05,
        type: "2x2",
      }),
    ]),
    preset("nebula-warp", "Warped cloud", 0.13, [
      layer(beam(135, 0, 70), {
        clumps: { cut: 0.5, frequency: 0.004, seed: 2 },
        scale: 0.3,
        size: 5,
        speed: 0.04,
      }),
    ]),
    preset("nebula-dust", "Cloud with dust", 0.15, [
      layer(glow(8, 20, 50, 45), {
        scale: 0.4,
        shape: "simplex",
        size: 4,
        speed: 0.06,
      }),
      layer(beam(135, 10, 85), {
        clumps: { cut: 0.62, frequency: 0.013, seed: 6 },
        size: 2,
      }),
    ]),
    preset("nebula-grain", "Grain cloud", 0.13, [
      layer(beam(135, 0, 55), {
        scale: 0.35,
        shape: "simplex",
        size: 7,
        speed: 0.06,
        type: "random",
      }),
    ]),
    preset("nebula-swirl", "Slow swirl", 0.14, [
      layer(glow(10, 18, 55, 55, 80), {
        scale: 0.4,
        shape: "swirl",
        size: 5,
        speed: 0.05,
      }),
    ]),
  ],
};

const erosion = (
  id: string,
  name: string,
  clumps: DitherClumps,
  options: LayerOptions = {},
  opacity = 0.15
) =>
  preset(id, name, opacity, [layer(beam(135, 0, 95), { clumps, ...options })]);

const EROSION: DitherFamily = {
  description:
    "Noise carves the whole field into islands that thin out diagonally.",
  name: "Erosion",
  presets: [
    erosion("erosion-islands", "Islands", { frequency: 0.007, seed: 3 }),
    erosion(
      "erosion-archipelago",
      "Archipelago",
      { frequency: 0.015, seed: 9 },
      { size: 2 }
    ),
    erosion(
      "erosion-continents",
      "Continents",
      { cut: 0.5, frequency: 0.004, seed: 5 },
      { scale: 0.5, size: 4 },
      0.13
    ),
    erosion(
      "erosion-frayed",
      "Frayed edges",
      { edge: 6, frequency: 0.008, octaves: 5, seed: 12 },
      {}
    ),
    erosion(
      "erosion-cut",
      "Cut edges",
      { edge: 30, frequency: 0.008, octaves: 2, seed: 12 },
      {}
    ),
    erosion(
      "erosion-sparse",
      "Sparse",
      { cut: 0.68, frequency: 0.009, seed: 17 },
      {},
      0.17
    ),
    erosion(
      "erosion-dense",
      "Dense",
      { cut: 0.45, frequency: 0.009, seed: 17 },
      {},
      0.12
    ),
    preset("erosion-mass", "Corner mass breaking up", 0.15, [
      layer(glow(0, 0, 40, 45), { type: "8x8" }),
      layer(beam(135, 0, 95), {
        clumps: { cut: 0.6, frequency: 0.008, seed: 23 },
        type: "8x8",
      }),
    ]),
  ],
};

const LAYERED: DitherFamily = {
  description: "A coarse slow layer behind a fine fast one, for depth.",
  name: "Layered depth",
  presets: [
    preset("layered-parallax", "Parallax", 0.16, [
      layer(beam(135, 0, 55), {
        opacity: 0.6,
        scale: 0.35,
        size: 6,
        speed: 0.04,
      }),
      layer(beam(135, 5, 80), {
        clumps: { frequency: 0.01, seed: 4 },
        scale: 1,
        size: 2,
        speed: 0.2,
      }),
    ]),
    preset("layered-cloud-dust", "Cloud behind dust", 0.16, [
      layer(beam(135, 0, 60), {
        opacity: 0.6,
        scale: 0.35,
        shape: "simplex",
        size: 5,
        speed: 0.05,
        type: "8x8",
      }),
      layer(beam(135, 8, 78), {
        clumps: { frequency: 0.009, seed: 3 },
        size: 2,
      }),
    ]),
    preset("layered-grain", "Grain behind bayer", 0.16, [
      layer(beam(135, 0, 50), {
        opacity: 0.5,
        scale: 0.4,
        size: 7,
        speed: 0.04,
        type: "random",
      }),
      layer(beam(135, 5, 75), {
        clumps: { frequency: 0.008, seed: 3 },
        size: 3,
      }),
    ]),
    preset("layered-streaks", "Haze under streaks", 0.15, [
      layer(beam(135, 0, 85), {
        opacity: 0.45,
        scale: 0.3,
        size: 5,
        speed: 0.03,
      }),
      layer(beam(135, 0, 40), {
        rotation: 45,
        scale: 0.8,
        size: 2,
        speed: 0.16,
      }),
      layer(beam(135, 10, 75), {
        clumps: { frequency: 0.01, seed: 8 },
        rotation: 45,
        scale: 0.8,
        size: 2,
        speed: 0.16,
      }),
    ]),
    preset("layered-scatter", "Corner over scatter", 0.15, [
      layer(glow(6, 20, 50, 45), { size: 4, speed: 0.08 }),
      layer(beam(135, 0, 100), {
        clumps: { cut: 0.66, frequency: 0.012, seed: 29 },
        opacity: 0.7,
        size: 2,
        speed: 0.2,
      }),
    ]),
    preset("layered-three", "Three depths", 0.16, [
      layer(beam(135, 0, 70), {
        opacity: 0.4,
        scale: 0.3,
        size: 7,
        speed: 0.03,
      }),
      layer(beam(135, 0, 50), {
        opacity: 0.7,
        scale: 0.6,
        size: 4,
        speed: 0.08,
      }),
      layer(beam(135, 10, 78), {
        clumps: { frequency: 0.011, seed: 3 },
        scale: 1.1,
        size: 2,
        speed: 0.18,
      }),
    ]),
    preset("layered-crossing", "Crossing directions", 0.15, [
      layer(beam(160, 0, 55), {
        opacity: 0.55,
        scale: 0.4,
        size: 5,
        speed: 0.05,
      }),
      layer(beam(120, 5, 75), {
        clumps: { frequency: 0.009, seed: 3 },
        rotation: 45,
        size: 2,
        speed: 0.16,
      }),
    ]),
  ],
};

export const DITHER_FAMILIES: readonly DitherFamily[] = [
  STREAMS,
  NEBULA,
  EROSION,
  LAYERED,
];

export const DITHER_PRESETS: readonly DitherPreset[] = DITHER_FAMILIES.flatMap(
  (family) => family.presets
);
