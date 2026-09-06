import type { PublicPromptWithVersions } from "@anpord/schema/public/shapes";
import { DateTime } from "effect";
import type { PromptFallback, PromptSelector } from "./types";

/** No version the API returns is zero, so a logged 0 reads as a fallback. */
const FALLBACK_VERSION = 0;

/** Branded fields are asserted, not decoded: this value never touches the API,
 * and a fallback that could fail to parse would defeat its purpose. */
export const fallbackPrompt = (
  selector: PromptSelector,
  fallback: PromptFallback,
  now: number
): PublicPromptWithVersions => {
  const given = typeof fallback === "string" ? { content: fallback } : fallback;

  return {
    channel: selector.channel ?? null,
    config: given.config ?? {},
    content: given.content,
    createdAt: DateTime.unsafeMake(now),
    id: selector.id,
    message: null,
    name: selector.id,
    version: FALLBACK_VERSION,
  } as PublicPromptWithVersions;
};
