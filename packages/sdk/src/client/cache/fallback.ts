import type { PublicPromptWithVersions } from "@anpord/schema/public/shapes";
import { DateTime } from "effect";
import type { PromptFallback, PromptSelector } from "./types";

/** No version the API can return is zero, so a caller who logs it knows
 * without being told that they are reading a fallback rather than a prompt. */
const FALLBACK_VERSION = 0;

/**
 * The shape of a prompt, built from what the caller had to hand.
 *
 * The branded fields are asserted rather than decoded: this value never came
 * from the API and never goes back to it, and a fallback that could fail to
 * parse would defeat the reason it exists.
 */
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
