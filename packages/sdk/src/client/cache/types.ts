import type { Variables } from "@anpord/template/render";

export interface PromptSelector {
  readonly channel?: string;
  readonly id: string;
  readonly includeVersions?: boolean;
  readonly version?: number;
}

/** A string, or an object when there is config to fall back on too. */
export type PromptFallback =
  | string
  | { readonly config?: Record<string, unknown>; readonly content: string };

export interface GetPromptOptions extends PromptSelector {
  readonly fallback?: PromptFallback;
  readonly variables?: Variables;
}

export interface PromptMetadata {
  readonly ageMs: number;
  readonly freshness: "fresh" | "cached" | "stale" | "fallback";
  readonly key: string;
  /** Present when the answer is stale or a fallback, naming what went wrong. */
  readonly reason?: string;
}
