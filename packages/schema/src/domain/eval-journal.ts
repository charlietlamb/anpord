import { Either, Schema } from "effect";
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

const SUBJECT_KEYS = [
  "skill",
  "command",
  "cmd",
  "file_path",
  "filePath",
  "path",
  "pattern",
  "query",
  "url",
  "name",
  "description",
  "prompt",
] as const;

const decodeJson = Schema.decodeUnknownEither(Schema.parseJson());

const firstText = (values: readonly unknown[]) =>
  values.find(
    (value): value is string => typeof value === "string" && value.trim() !== ""
  ) ?? null;

export const callSubjectOf = (input: string | undefined): string | null => {
  if (input === undefined || input.trim() === "") {
    return null;
  }

  const decoded = decodeJson(input);

  if (Either.isLeft(decoded)) {
    return input.trim();
  }

  const value = decoded.right;

  if (typeof value === "string") {
    return value.trim() === "" ? null : value.trim();
  }

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const fields = value as Readonly<Record<string, unknown>>;

  return (
    firstText(SUBJECT_KEYS.map((key) => fields[key])) ??
    firstText(Object.values(fields))
  );
};

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
