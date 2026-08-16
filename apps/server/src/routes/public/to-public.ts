import type { PromptSummary, ResolvedPrompt } from "@anpord/schema/prompts";
import type {
  PublicPrompt,
  PublicPromptSummary,
  PublicVersion,
} from "@anpord/schema/public/shapes";
import { DateTime } from "effect";

const instant = (value: Date) => DateTime.unsafeFromDate(new Date(value));

export const toPublicPrompt = (row: ResolvedPrompt): PublicPrompt => ({
  channel: row.channel,
  config: row.config,
  content: row.content,
  createdAt: instant(row.createdAt),
  id: row.id,
  message: row.commitMessage,
  name: row.name,
  version: row.version,
});

export const toPublicSummary = (row: PromptSummary): PublicPromptSummary => ({
  id: row.id,
  latestVersion: row.latestVersion,
  name: row.name,
  productionVersion: row.productionVersion,
  updatedAt: instant(row.updatedAt),
});

export const toPublicVersion = (row: ResolvedPrompt): PublicVersion => ({
  createdAt: instant(row.createdAt),
  message: row.commitMessage,
  version: row.version,
});
