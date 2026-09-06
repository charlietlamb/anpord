import type { Option } from "effect";
import { nanosOf } from "./cost-arithmetic";
import type { CostComponent } from "./cost-component";
import type { HarnessUsage } from "./harness-event";
import { costOf, type ModelPrice } from "./model-price";

/* Failures included: a trial that ran and failed consumed what a passing one did. */
const PLATFORM_UNITS = 1;

const subscriptionAuth = new Set(["chatgpt", "legacy-auth-json"]);

const connectionMode = (authMethodId: string | null) => {
  if (authMethodId === null) {
    return "unknown" as const;
  }

  return subscriptionAuth.has(authMethodId)
    ? ("subscription" as const)
    : ("api" as const);
};

export const modelComponent = (input: {
  readonly authMethodId: string | null;
  readonly model: string;
  readonly price: Option.Option<ModelPrice>;
  readonly usage: HarnessUsage | null;
}): CostComponent => {
  const base = { component: "model" as const };

  if (input.usage === null) {
    return {
      ...base,
      amountNanos: null,
      classification: "unknown",
      detail: { model: input.model },
      explanation: "The harness reported no usage for this trial.",
      source: "harness",
    };
  }

  const tokens = {
    cacheReadTokens: input.usage.cacheReadTokens,
    cacheWriteTokens: input.usage.cacheWriteTokens,
    inputTokens: input.usage.inputTokens,
    model: input.model,
    outputTokens: input.usage.outputTokens,
  };

  if (input.price._tag === "None") {
    /* An empty model name is the connection choosing for itself, not a gap in
       the catalogue. */
    const because =
      input.model === ""
        ? "The connection chose its own model, which it does not name, so its usage cannot be priced."
        : `No published rate for ${input.model}, so its usage cannot be priced.`;

    return {
      ...base,
      amountNanos: null,
      classification: "unknown",
      detail: tokens,
      explanation: because,
      source: "models.dev",
    };
  }

  const rate = input.price.value;

  /* An estimate even on a subscription, which may charge nothing marginal. */
  return {
    ...base,
    amountNanos: nanosOf(costOf(input.usage, rate)),
    classification: "estimate",
    detail: { ...tokens, rateSnapshot: rate },
    explanation: subscriptionAuth.has(input.authMethodId ?? "")
      ? "Priced at the model's published rate. The usage counts against a subscription, so it may create no separate charge."
      : "Priced at the model's published rate when the trial ran, not from a bill.",
    source: "models.dev",
  };
};

export const harnessComponent = (input: {
  readonly authMethodId: string | null;
  readonly harness: string;
  readonly modelMs: number;
}): CostComponent => {
  const mode = connectionMode(input.authMethodId);

  return {
    amountNanos: null,
    classification: mode === "unknown" ? "unknown" : "included",
    component: "harness",
    detail: {
      connectionMode: mode,
      durationMs: input.modelMs,
      harness: input.harness,
    },
    /* Never the model's cost: copying one into the other doubles reported spend. */
    explanation:
      mode === "unknown"
        ? "The connection this ran on is not recorded, so the harness cannot be priced."
        : `The ${input.harness} runtime bills nothing separately from the model it calls.`,
    source: "connection",
  };
};

export const sandboxComponent = (input: {
  readonly hasOwnCredential: boolean;
  readonly provider: string;
  readonly sandboxMs: number;
}): CostComponent => ({
  amountNanos: null,
  /* Ours is unbilled to the customer; theirs is billed by the provider with no
     amount visible to us. Neither is zero. */
  classification: input.hasOwnCredential ? "unknown" : "managed",
  component: "sandbox",
  detail: {
    billableDurationMs: input.sandboxMs,
    connectionMode: input.hasOwnCredential ? "user" : "managed",
    provider: input.provider,
    sessions: 1,
  },
  explanation: input.hasOwnCredential
    ? `Billed by ${input.provider} to your own account, which reports no amount here.`
    : `Run on our ${input.provider} account and not billed to you.`,
  source: "connection",
});

export const platformComponent = (): CostComponent => ({
  amountNanos: null,
  classification: "included",
  component: "platform",
  detail: { evalUnits: PLATFORM_UNITS },
  explanation: "Metered in eval units rather than priced per trial.",
  source: "platform",
});
