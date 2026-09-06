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

/* `thinking` is not a journal entry but the gap between two, and it is presented like the rest. */
export type JournalKind = EvalJournalEntry["_tag"] | "thinking";

/* Theme tokens, not literals: an inline style cannot answer a media query, so hard-coded hues break contrast when the theme flips. */
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

export const KIND_ICONS: Record<JournalKind, Icon> = {
  command: TerminalWindowIcon,
  fileChange: FilePlusIcon,
  message: ChatCircleDotsIcon,
  thinking: BrainIcon,
  toolCall: WrenchIcon,
};

export const kindOf = (row: WaterfallRow): JournalKind => row.entry._tag;

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

/* Without this every row announces as "button": its only text lives in a tooltip a screen reader never opens. */
export const describeRow = (row: WaterfallRow): string => {
  const took = row._tag === "bar" ? `, ${seconds(row.durationMs)}` : "";
  const after =
    row.lead === null ? "" : `, after ${seconds(row.lead.durationMs)} thinking`;

  return `${KIND_NAMES[kindOf(row)]}${took}${after}: ${labelOf(row.entry)}`;
};
