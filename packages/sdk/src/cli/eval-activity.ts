import {
  type EntryKind,
  entryKindOf,
  labelOf,
} from "@anpord/schema/domain/eval-journal";
import type { EvalJournalEntry } from "@anpord/schema/domain/evals";

const ESCAPE = String.fromCharCode(27);

type Paint = (text: string) => string;

const tint =
  (code: number): Paint =>
  (text) =>
    `${ESCAPE}[${code}m${text}${ESCAPE}[0m`;

const BLUE = tint(34);
const BOLD = tint(1);
const CYAN = tint(36);
const DIM = tint(2);
const GREEN = tint(32);
const MAGENTA = tint(35);
const RED = tint(31);
const YELLOW = tint(33);

const unpainted: Paint = (text) => text;

export interface EntryStyle {
  readonly colour: boolean;
  readonly width: number;
}

export const PLAIN: EntryStyle = { colour: false, width: 72 };

interface KindStyle {
  readonly body: Paint;
  readonly glyph: string;
  readonly mark: Paint;
  readonly speaker: string | null;
}

const STYLES: Record<EntryKind, KindStyle> = {
  command: { body: DIM, glyph: "$", mark: YELLOW, speaker: null },
  fileChange: { body: GREEN, glyph: "+", mark: GREEN, speaker: null },
  message: { body: unpainted, glyph: "‹", mark: MAGENTA, speaker: "agent" },
  said: { body: CYAN, glyph: "›", mark: CYAN, speaker: "user" },
  toolCall: { body: DIM, glyph: "·", mark: BLUE, speaker: null },
};

const flat = (text: string) => text.replace(/\s+/g, " ").trim();

const clipped = (text: string, width: number) =>
  text.length > width ? `${text.slice(0, Math.max(1, width - 1))}…` : text;

const textOf = (entry: EvalJournalEntry, width: number) =>
  entry._tag === "message"
    ? flat(labelOf(entry))
    : clipped(flat(labelOf(entry)), width);

const failureOf = (entry: EvalJournalEntry) =>
  entry._tag === "command" && entry.exitCode !== null && entry.exitCode !== 0
    ? ` exit ${entry.exitCode}`
    : "";

export const opensTurn = (entry: EvalJournalEntry) =>
  entryKindOf(entry) === "said";

export const formatEntry = (
  entry: EvalJournalEntry,
  style: EntryStyle = PLAIN
) => {
  const { body, glyph, mark, speaker } = STYLES[entryKindOf(entry)];
  const lead = speaker === null ? glyph : `${glyph} ${speaker}`;
  const text = textOf(entry, style.width);
  const failure = failureOf(entry);

  return style.colour
    ? `${BOLD(mark(lead))} ${body(text)}${failure === "" ? "" : RED(failure)}`
    : `${lead} ${text}${failure}`;
};
