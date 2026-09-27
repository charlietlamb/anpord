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
const MARGIN = "  ";
const INDENT = "  ";
const WHITESPACE = /\s+/g;

export const terminalStyle = (colour: boolean): TranscriptStyle =>
  colour && process.env.NO_COLOR === undefined
    ? {
        colour: true,
        width: Math.max(NARROWEST, process.stderr.columns ?? UNKNOWN_WIDTH),
      }
    : PLAIN;

export const stderrStyle = () => terminalStyle(process.stderr.isTTY === true);

export const flat = (text: string) => text.replace(WHITESPACE, " ").trim();

export const clipped = (text: string, width: number) =>
  text.length > width ? `${text.slice(0, Math.max(1, width - 1))}…` : text;

export const writerFor = (style: TranscriptStyle) => {
  const paint = paletteFor(style.colour);
  const room = Math.max(1, style.width - MARGIN.length - INDENT.length);
  const line = (text: string) => `${MARGIN}${text}`;
  const nested = (text: string, depth = 1) =>
    line(`${INDENT.repeat(depth)}${text}`);

  const indented = (text: string, depth: number, tone: Paint = (row) => row) =>
    wrapText(text, room - INDENT.length * (depth - 1)).map((row) =>
      row === "" ? "" : nested(tone(row), depth)
    );

  const header = ({ caseName, ordinal, variant }: Speaker) =>
    line(
      `${paint.bold(caseName)}  ${paint.dim(variant)}${ordinal === null ? "" : paint.dim(` · trial ${ordinal}`)}`
    );

  const heading = (glyph: string, label: string, tone: Paint) =>
    line(tone(`${glyph} ${paint.bold(label)}`));

  const branch = (text: string) => nested(`${paint.dim("├")} ${text}`);

  const close = (text: string) => nested(`${paint.dim("└")} ${text}`);

  return {
    branch,
    close,
    header,
    heading,
    indented,
    line,
    nested,
    paint,
    room,
  };
};

export type Writer = ReturnType<typeof writerFor>;
