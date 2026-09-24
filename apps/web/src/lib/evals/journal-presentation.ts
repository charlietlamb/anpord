import {
  ENTRY_NAMES,
  type EntryKind,
  entryKindOf,
  labelOf,
} from "@anpord/schema/domain/eval-journal";
import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import {
  BrainIcon,
  ChatCircleDotsIcon,
  FilePlusIcon,
  type Icon,
  TerminalWindowIcon,
  UserIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import { seconds } from "@/lib/evals/duration";
import type { WaterfallRow } from "@/lib/evals/waterfall-layout";

export type JournalKind = EntryKind | "thinking";

export const KIND_COLOURS: Record<JournalKind, string> = {
  command: "var(--trace-command)",
  fileChange: "var(--trace-file)",
  message: "var(--trace-message)",
  said: "var(--trace-said)",
  thinking: "var(--trace-thinking)",
  toolCall: "var(--trace-tool)",
};

export const KIND_NAMES: Record<JournalKind, string> = {
  ...ENTRY_NAMES,
  thinking: "Thinking",
};

export const KIND_ICONS: Record<JournalKind, Icon> = {
  command: TerminalWindowIcon,
  fileChange: FilePlusIcon,
  message: ChatCircleDotsIcon,
  said: UserIcon,
  thinking: BrainIcon,
  toolCall: WrenchIcon,
};

export const kindOf = (row: WaterfallRow): JournalKind =>
  entryKindOf(row.entry);

export const describeRow = (row: WaterfallRow): string => {
  const took = row._tag === "bar" ? `, ${seconds(row.durationMs)}` : "";
  const after =
    row.lead === null ? "" : `, after ${seconds(row.lead.durationMs)} thinking`;

  return `${KIND_NAMES[kindOf(row)]}${took}${after}: ${labelOf(row.entry)}`;
};

export const journalKey = (entry: EvalJournalEntry, index: number) =>
  [index, entry._tag, entry.finishedAtMillis ?? "unknown"].join("-");
