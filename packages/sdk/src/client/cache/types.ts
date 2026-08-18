import type { Variables } from "@anpord/template/render";

export interface PromptSelector {
  readonly channel?: string;
  readonly id: string;
  readonly includeVersions?: boolean;
  readonly version?: number;
}

/** A string for the common case, an object when there is config to fall back
 * on too. Never a whole prompt: inventing a version and a timestamp for a
 * hardcoded string is work the caller should not have to do. */
export type PromptFallback =
  | string
  | { readonly config?: Record<string, unknown>; readonly content: string };

export interface GetPromptOptions extends PromptSelector {
  readonly fallback?: PromptFallback;
  readonly variables?: Variables;
}

export interface PromptMetadata {
  readonly ageMs: number;
  /** Why the caller received the value they received. */
  readonly freshness: "fresh" | "cached" | "stale" | "fallback";
  readonly key: string;
  /** Present when the answer is stale or a fallback, naming what went wrong. */
  readonly reason?: string;
}
