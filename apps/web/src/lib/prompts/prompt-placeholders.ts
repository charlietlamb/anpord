import { PromptSummary, ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { Schema } from "effect";
import { placeholders, placeholderText } from "@/lib/placeholders";

const EPOCH = new Date(0);
const AUTHOR = { image: null, name: "Placeholder author" };

export const PLACEHOLDER_PROMPTS = placeholders(8, (index) =>
  Schema.decodeUnknownSync(PromptSummary)({
    author: AUTHOR,
    description: placeholderText(index + 1),
    id: `placeholder-${index}`,
    latestVersion: 1,
    name: placeholderText(index),
    productionVersion: 1,
    updatedAt: EPOCH,
  })
);

export const placeholderVersions = (id: string) =>
  placeholders(3, (index) =>
    Schema.decodeUnknownSync(ResolvedPrompt)({
      author: AUTHOR,
      channel: null,
      commitMessage: placeholderText(index),
      config: {},
      content: placeholders(4, placeholderText).join("\n"),
      createdAt: EPOCH,
      id,
      name: placeholderText(0),
      version: 3 - index,
      versionId: `placeholder-version-${index}`,
    })
  );
