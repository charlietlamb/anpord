import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import {
  BrainIcon,
  ChatCircleDotsIcon,
  FilePlusIcon,
  type Icon,
  TerminalWindowIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import { seconds } from "@/lib/evals/duration";
import type { WaterfallRow } from "@/lib/evals/waterfall-layout";

/** What a trajectory can be made of. `thinking` is not a journal entry: it is
 * the gap between two, and it carries a colour and a name like the rest. */
export type JournalKind = EvalJournalEntry["_tag"] | "thinking";

/**
 * Read from the theme rather than written here, because an inline style cannot
 * answer a media query: literals tuned against a dark ground stayed put when
 * the page turned white, leaving four of five bars under the contrast floor.
 * The tokens also hold these hues away from the semantic ones, where a file
 * change had been drawn at the success green exactly.
 */
export const KIND_COLOURS: Record<JournalKind, string> = {
  command: "var(--trace-command)",
  fileChange: "var(--trace-file)",
  message: "var(--trace-message)",
  thinking: "var(--trace-thinking)",
  toolCall: "var(--trace-tool)",
};

export const KIND_NAMES: Record<JournalKind, string> = {
  command: "Command",
  fileChange: "Wrote files",
  message: "Message",
  thinking: "Thinking",
  toolCall: "Tool call",
};

/** One glyph per kind, so a tooltip says what happened before it is read. */
export const KIND_ICONS: Record<JournalKind, Icon> = {
  command: TerminalWindowIcon,
  fileChange: FilePlusIcon,
  message: ChatCircleDotsIcon,
  thinking: BrainIcon,
  toolCall: WrenchIcon,
};

export const kindOf = (row: WaterfallRow): JournalKind => row.entry._tag;

/** What the entry was, in the words the entry itself carries. */
export const labelOf = (entry: EvalJournalEntry) => {
  if (entry._tag === "command") {
    return entry.command;
  }

  if (entry._tag === "toolCall") {
    return entry.name;
  }

  if (entry._tag === "fileChange") {
    return `wrote ${entry.paths.join(", ")}`;
  }

  return entry.text;
};

/** The row spoken aloud. Without it every row of the chart announces as
 * "button", because the only text it carries lives in a tooltip a screen
 * reader never opens. */
export const describeRow = (row: WaterfallRow): string => {
  const took = row._tag === "bar" ? `, ${seconds(row.durationMs)}` : "";
  const after =
    row.lead === null ? "" : `, after ${seconds(row.lead.durationMs)} thinking`;

  return `${KIND_NAMES[kindOf(row)]}${took}${after}: ${labelOf(row.entry)}`;
};
