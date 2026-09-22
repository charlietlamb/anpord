const ESCAPE = String.fromCharCode(27);

export type Paint = (text: string) => string;

const tint =
  (code: number): Paint =>
  (text) =>
    `${ESCAPE}[${code}m${text}${ESCAPE}[0m`;

const unpainted: Paint = (text) => text;

export interface Palette {
  readonly blue: Paint;
  readonly bold: Paint;
  readonly cyan: Paint;
  readonly dim: Paint;
  readonly green: Paint;
  readonly magenta: Paint;
  readonly red: Paint;
  readonly yellow: Paint;
}

const COLOURED: Palette = {
  blue: tint(34),
  bold: tint(1),
  cyan: tint(36),
  dim: tint(2),
  green: tint(32),
  magenta: tint(35),
  red: tint(31),
  yellow: tint(33),
};

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
  colour ? COLOURED : MONOCHROME;
