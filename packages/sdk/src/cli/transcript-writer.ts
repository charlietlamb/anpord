import { type Paint, paletteFor } from "./paint";
import { wrapText } from "./text-wrap";
import type { Speaker } from "./transcript-turn";

export interface TranscriptStyle {
  readonly colour: boolean;
  readonly width: number;
}

export const PLAIN: TranscriptStyle = { colour: false, width: 80 };

const NARROWEST = 40;
const UNKNOWN_WIDTH = 100;
const MARGIN = 2;
const RAIL_WIDTH = 2;
const INDENT = "  ";
const WHITESPACE = /\s+/g;

export const terminalStyle = (colour: boolean): TranscriptStyle =>
  colour && process.env.NO_COLOR === undefined
    ? {
        colour: true,
        width: Math.max(NARROWEST, process.stderr.columns ?? UNKNOWN_WIDTH),
      }
    : PLAIN;

export const flat = (text: string) => text.replace(WHITESPACE, " ").trim();

export const clipped = (text: string, width: number) =>
  text.length > width ? `${text.slice(0, Math.max(1, width - 1))}…` : text;

export const writerFor = (style: TranscriptStyle) => {
  const paint = paletteFor(style.colour);
  const room = Math.max(1, style.width - MARGIN - RAIL_WIDTH);
  const rail = paint.dim("│");
  const blank = `  ${rail}`;
  const line = (text: string) => `  ${rail} ${text}`;

  const indented = (text: string, depth: number, tone: Paint = (row) => row) =>
    wrapText(text, room - INDENT.length * depth).map((row) =>
      row === "" ? blank : line(`${INDENT.repeat(depth)}${tone(row)}`)
    );

  const header = ({ caseName, ordinal, variant }: Speaker) => {
    const facts = [variant, ordinal === null ? "" : `trial ${ordinal}`]
      .filter((fact) => fact !== "")
      .map((fact) => ` · ${fact}`)
      .join("");

    return `  ${paint.dim("┌")} ${paint.bold(caseName)}${paint.dim(facts)}`;
  };

  const heading = (label: string, tone: Paint) => [
    blank,
    line(paint.bold(tone(label))),
  ];

  const close = (text: string) => `  ${paint.dim("└")} ${text}`;

  return { blank, close, header, heading, indented, line, paint, room };
};

export type Writer = ReturnType<typeof writerFor>;
