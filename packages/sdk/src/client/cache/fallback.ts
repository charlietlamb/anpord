import type { PromptFallback, PromptSelector } from "./types";

/** No version the API can return is zero, so a caller who logs it knows
 * without being told that they are reading a fallback rather than a prompt. */
const FALLBACK_VERSION = 0;

export const fallbackPrompt = (
  selector: PromptSelector,
  fallback: PromptFallback,
  now: number
) => {
  const given = typeof fallback === "string" ? { content: fallback } : fallback;

  return {
    channel: selector.channel ?? null,
    config: given.config ?? {},
    content: given.content,
    createdAt: new Date(now),
    id: selector.id,
    message: null,
    name: selector.id,
    version: FALLBACK_VERSION,
  };
};
