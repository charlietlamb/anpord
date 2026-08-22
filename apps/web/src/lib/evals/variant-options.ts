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
 * What this credential can actually run.
 *
 * Verified against the pinned binary rather than assumed: model names move,
 * and the ones a search would suggest -- `gpt-5-codex`, `gpt-5`,
 * `codex-mini-latest` -- are all refused now with
 * `400 ... not supported when using Codex with a ChatGPT account`. Codex's own
 * config even carries a migration table rewriting one name to another.
 *
 * So this list is a snapshot with a short life, and a model missing from it
 * is a gap in the list rather than a value the system refuses: `model` is a
 * free string on the wire, and a wrong one fails its trial loudly instead of
 * running something else quietly.
 */
export const MODEL_OPTIONS: readonly VariantOption[] = [
  {
    description: "The default this account runs",
    label: "gpt-5.6-sol",
    value: "gpt-5.6-sol",
  },
  {
    description: "The previous generation, for a baseline",
    label: "gpt-5.5",
    value: "gpt-5.5",
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

export const DEFAULT_MODEL = "gpt-5.6-sol";
export const DEFAULT_PROVIDER: EvalProvider = "daytona";
