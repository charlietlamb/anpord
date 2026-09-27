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
  lavender: { fallback: 146, rgb: [170, 160, 204] },
  magenta: { fallback: 141, rgb: [182, 156, 246] },
  red: { fallback: 167, rgb: [229, 104, 107] },
  rose: { fallback: 181, rgb: [204, 158, 172] },
  sand: { fallback: 180, rgb: [200, 176, 138] },
  slate: { fallback: 110, rgb: [138, 164, 204] },
  teal: { fallback: 109, rgb: [128, 184, 178] },
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

const colouredWith = (trueColour: boolean) =>
  Object.fromEntries([
    ["bold", wrap("1")],
    ...Object.entries(SHADES).map(([name, shade]) => [
      name,
      wrap(shadeCode(shade, trueColour)),
    ]),
  ]) as Palette;

const MONOCHROME = Object.fromEntries(
  ["bold", ...Object.keys(SHADES)].map((name) => [name, unpainted])
) as Palette;

export const paletteFor = (colour: boolean): Palette =>
  colour
    ? colouredWith(TRUE_COLOUR.has(process.env.COLORTERM ?? ""))
    : MONOCHROME;
