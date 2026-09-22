import type { EvalJournalEntry } from "./evals";

export type EntryKind = EvalJournalEntry["_tag"] | "said";

export const entryKindOf = (entry: EvalJournalEntry): EntryKind =>
  entry._tag === "message" && entry.role === "user" ? "said" : entry._tag;

export const ENTRY_NAMES: Record<EntryKind, string> = {
  command: "Command",
  fileChange: "Wrote files",
  message: "Message",
  said: "Said",
  toolCall: "Tool call",
};

const SHELL_PREFIX = /^\/bin\/(?:ba)?sh -lc ['"]?/;
const TRAILING_QUOTE = /['"]$/;

export const commandText = (command: string) =>
  command.replace(SHELL_PREFIX, "").replace(TRAILING_QUOTE, "").trim();

export const labelOf = (entry: EvalJournalEntry) => {
  if (entry._tag === "command") {
    return commandText(entry.command);
  }

  if (entry._tag === "toolCall") {
    return entry.name;
  }

  if (entry._tag === "fileChange") {
    return `wrote ${entry.paths.join(", ")}`;
  }

  return entry.text;
};
