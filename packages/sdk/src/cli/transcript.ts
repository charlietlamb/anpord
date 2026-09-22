import { callSubjectOf, commandText } from "@anpord/schema/domain/eval-journal";
import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { type Paint, paletteFor } from "./paint";
import { wrapText } from "./text-wrap";
import {
  openedTurn,
  repliedTurn,
  type Speaker,
  type Turn,
  turnFacts,
} from "./transcript-turn";

export interface TranscriptStyle {
  readonly colour: boolean;
  readonly width: number;
}

export const PLAIN: TranscriptStyle = { colour: false, width: 80 };

export interface Spoken {
  readonly entry: EvalJournalEntry;
  readonly speaker: Speaker;
}

export interface Transcript {
  readonly current: string | null;
  readonly turns: ReadonlyMap<string, Turn>;
}

export const EMPTY_TRANSCRIPT: Transcript = { current: null, turns: new Map() };

const MARGIN = 2;
const RAIL_WIDTH = 2;
const BODY_INDENT = "  ";
const WHITESPACE = /\s+/g;

const flat = (text: string) => text.replace(WHITESPACE, " ").trim();

const clipped = (text: string, width: number) =>
  text.length > width ? `${text.slice(0, Math.max(1, width - 1))}…` : text;

const writer = (style: TranscriptStyle) => {
  const paint = paletteFor(style.colour);
  const room = Math.max(1, style.width - MARGIN - RAIL_WIDTH);
  const rail = paint.dim("│");
  const line = (text: string) => `  ${rail} ${text}`;
  const blank = `  ${rail}`;

  const header = ({ caseName, ordinal, variant }: Speaker) => {
    const facts = [variant, ordinal === null ? null : `trial ${ordinal}`]
      .filter((fact): fact is string => fact !== null && fact !== "")
      .map((fact) => ` · ${fact}`)
      .join("");

    return `  ${paint.dim("┌")} ${paint.bold(caseName)}${paint.dim(facts)}`;
  };

  const block = (label: string, tone: Paint, text: string) => [
    blank,
    line(paint.bold(tone(label))),
    ...wrapText(text, room - BODY_INDENT.length).map((row) =>
      row === "" ? blank : line(`${BODY_INDENT}${row}`)
    ),
  ];

  const footer = (turn: Turn) => [
    blank,
    line(
      turn.replied
        ? `${paint.green("✓")} ${paint.dim(turnFacts(turn))}`
        : paint.dim(`· ${turnFacts(turn)} · no reply`)
    ),
  ];

  return { block, footer, header, line, paint, room };
};

type Writer = ReturnType<typeof writer>;

const stepOf = (
  entry: Exclude<EvalJournalEntry, { readonly _tag: "message" }>,
  { line, paint, room }: Writer
) => {
  const width = room - RAIL_WIDTH;

  if (entry._tag === "command") {
    const failed = entry.exitCode !== null && entry.exitCode !== 0;

    return line(
      `${paint.yellow("$")} ${paint.dim(clipped(flat(commandText(entry.command)), width))}${failed ? paint.red(` exit ${entry.exitCode}`) : ""}`
    );
  }

  if (entry._tag === "fileChange") {
    return line(
      `${paint.green("+")} ${paint.dim(clipped(`wrote ${entry.paths.join(", ")}`, width))}`
    );
  }

  const subject = callSubjectOf(entry.input);
  const detail =
    subject === null
      ? ""
      : ` ${paint.dim(clipped(flat(subject), Math.max(1, width - entry.name.length - 1)))}`;

  return line(
    `${paint.blue("●")} ${entry.name}${detail}${entry.error === undefined ? "" : paint.red(" failed")}`
  );
};

export const transcribe = (
  transcript: Transcript,
  spoken: readonly Spoken[],
  style: TranscriptStyle
) => {
  const write = writer(style);
  const turns = new Map(transcript.turns);
  const lines: string[] = [];
  let current = transcript.current;

  for (const { entry, speaker } of spoken) {
    if (speaker.key !== current) {
      lines.push(...(current === null ? [] : [""]), write.header(speaker));
      current = speaker.key;
    }

    const turn = turns.get(speaker.key);

    if (entry._tag !== "message") {
      lines.push(stepOf(entry, write));
    } else if (entry.role === "user") {
      lines.push(...(turn?.open === true ? write.footer(turn) : []));
      turns.set(
        speaker.key,
        openedTurn(turn, speaker, entry.finishedAtMillis ?? null)
      );
      lines.push(...write.block("user", write.paint.cyan, entry.text));
    } else {
      turns.set(
        speaker.key,
        repliedTurn(turn, speaker, {
          costUsd: entry.usage?.costUsd ?? null,
          finishedAtMillis: entry.finishedAtMillis ?? null,
        })
      );
      lines.push(...write.block("agent", write.paint.magenta, entry.text));
    }
  }

  return { lines, transcript: { current, turns } };
};

export const settle = (
  transcript: Transcript,
  keys: readonly string[],
  style: TranscriptStyle
) => {
  const write = writer(style);
  const turns = new Map(transcript.turns);
  const lines: string[] = [];
  let current = transcript.current;

  for (const key of keys) {
    const turn = turns.get(key);

    if (turn?.open === true) {
      if (key !== current) {
        lines.push(
          ...(current === null ? [] : [""]),
          write.header(turn.speaker)
        );
        current = key;
      }

      lines.push(...write.footer(turn));
      turns.set(key, { ...turn, open: false });
    }
  }

  return { lines, transcript: { current, turns } };
};
