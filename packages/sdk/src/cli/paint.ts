const ESCAPE = String.fromCharCode(27);

export type Paint = (text: string) => string;

interface Shade {
  readonly fallback: number;
  readonly rgb: readonly [number, number, number];
}

const SHADES = {
  blue: { fallback: 111, rgb: [122, 162, 247] },
  cyan: { fallback: 80, rgb: [108, 196, 207] },
  dim: { fallback: 243, rgb: [118, 125, 135] },
  green: { fallback: 114, rgb: [108, 194, 135] },
  magenta: { fallback: 141, rgb: [182, 156, 246] },
  red: { fallback: 167, rgb: [229, 104, 107] },
  yellow: { fallback: 179, rgb: [217, 165, 91] },
} satisfies Record<string, Shade>;

const TRUE_COLOUR = new Set(["truecolor", "24bit"]);

const wrap =
  (code: string): Paint =>
  (text) =>
    `${ESCAPE}[${code}m${text}${ESCAPE}[0m`;

const shadeCode = ({ fallback, rgb }: Shade, trueColour: boolean) =>
  trueColour ? `38;2;${rgb.join(";")}` : `38;5;${fallback}`;

const unpainted: Paint = (text) => text;

export type Palette = Readonly<Record<keyof typeof SHADES | "bold", Paint>>;

const colouredWith = (trueColour: boolean): Palette => ({
  blue: wrap(shadeCode(SHADES.blue, trueColour)),
  bold: wrap("1"),
  cyan: wrap(shadeCode(SHADES.cyan, trueColour)),
  dim: wrap(shadeCode(SHADES.dim, trueColour)),
  green: wrap(shadeCode(SHADES.green, trueColour)),
  magenta: wrap(shadeCode(SHADES.magenta, trueColour)),
  red: wrap(shadeCode(SHADES.red, trueColour)),
  yellow: wrap(shadeCode(SHADES.yellow, trueColour)),
});

const MONOCHROME: Palette = {
  blue: unpainted,
  bold: unpainted,
  cyan: unpainted,
  dim: unpainted,
  green: unpainted,
  magenta: unpainted,
  red: unpainted,
  yellow: unpainted,
};

export const paletteFor = (colour: boolean): Palette =>
  colour
    ? colouredWith(TRUE_COLOUR.has(process.env.COLORTERM ?? ""))
    : MONOCHROME;
