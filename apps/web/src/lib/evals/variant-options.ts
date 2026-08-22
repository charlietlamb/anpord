import type { EvalProvider } from "@anpord/schema/domain/evals";

/**
 * What a person can pick a variant from.
 *
 * Held here rather than fetched, because the set changes when a harness gains
 * support for a model and not when a run finishes: a list this short and this
 * slow-moving is a deploy, not a request. `model` is a free string on the
 * wire, so a model missing from this list is a gap in the list rather than a
 * value the system refuses.
 */
export interface VariantOption<TValue extends string = string> {
  readonly description: string;
  readonly label: string;
  readonly value: TValue;
}

export const MODEL_OPTIONS: readonly VariantOption[] = [
  {
    description: "Tuned for agentic coding",
    label: "gpt-5-codex",
    value: "gpt-5-codex",
  },
  {
    description: "The general model",
    label: "gpt-5",
    value: "gpt-5",
  },
  {
    description: "Faster and cheaper, for a wide sweep",
    label: "gpt-5-mini",
    value: "gpt-5-mini",
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
