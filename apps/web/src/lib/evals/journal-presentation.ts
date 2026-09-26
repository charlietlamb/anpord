import type { EntryKind } from "@anpord/schema/domain/eval-journal";
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

export type JournalKind = EntryKind | "thinking";

export const KIND_ICONS: Record<JournalKind, Icon> = {
  command: TerminalWindowIcon,
  fileChange: FilePlusIcon,
  message: ChatCircleDotsIcon,
  said: UserIcon,
  thinking: BrainIcon,
  toolCall: WrenchIcon,
};

/* A running entry finishing must transition the row it already has, so the key
   holds its position and kind and never the time it settled. */
export const journalKey = (entry: EvalJournalEntry, index: number) =>
  [index, entry._tag].join("-");
