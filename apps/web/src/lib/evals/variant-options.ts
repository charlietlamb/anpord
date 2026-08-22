import type { EvalProvider } from "@anpord/schema/domain/evals";

/**
 * What a person can pick a variant from.
 *
 * Held here rather than fetched. The set changes when a credential gains
 * access to a model, not when a run finishes, so a list this short and this
 * slow-moving is a deploy rather than a request. `model` is a free string on
 * the wire, so a model missing from this list is a gap in the list rather
 * than a value the system refuses.
 */
export interface VariantOption<TValue extends string = string> {
  readonly description: string;
  readonly label: string;
  readonly value: TValue;
}

/**
 * One model, because one is what can currently run.
 *
 * Codex authenticates as a ChatGPT account, and that path refuses every model
 * passed explicitly, including the one it picks itself when asked for none.
 * A list of three would let somebody build a grid whose columns are the same
 * run under different headings, and report a difference of zero as if it
 * meant something.
 *
 * The second model arrives with an API-key credential, not with an edit here.
 */
export const MODEL_OPTIONS: readonly VariantOption[] = [
  {
    description: "What Codex runs on this account",
    label: "gpt-5-codex",
    value: "gpt-5-codex",
  },
];

export const PROVIDER_OPTIONS: readonly VariantOption<EvalProvider>[] = [
  {
    description: "Cloud sandboxes that reattach",
    label: "Daytona",
    value: "daytona",
  },
  {
    description: "Cloud sandboxes, faster to start",
    label: "E2B",
    value: "e2b",
  },
  {
    description: "A real shell on this machine, for trying it out",
    label: "Local",
    value: "local",
  },
];

export const DEFAULT_MODEL = "gpt-5-codex";
export const DEFAULT_PROVIDER: EvalProvider = "daytona";
