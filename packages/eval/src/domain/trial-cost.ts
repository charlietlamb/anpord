import type { Option } from "effect";
import type { HarnessUsage } from "./harness-event";
import { costOf, type ModelPrice } from "./model-price";

/* Rates are quoted per million tokens and a cheap trial costs a fraction of a
   cent, so cents cannot hold one and a float summed across a run drifts.
   Nano-units are exact under addition and hold nine billion of them. */
const NANOS = 1_000_000_000;

export const nanosOf = (amount: number) => BigInt(Math.round(amount * NANOS));

/**
 * How much of a cost is known, and on what basis.
 *
 * The distinction is the point. A public-rate calculation is not an invoice,
 * a subscription's marginal price is not zero, and a cost the platform absorbs
 * is not one the customer paid. Collapsing any of those into a number makes a
 * total that reads as authoritative and is not.
 */
type CostClassification =
  | "actual"
  | "allocated"
  | "estimate"
  | "included"
  | "managed"
  | "unknown";

/**
 * What one layer of a trial cost.
 *
 * `amountNanos` is null for anything not priced in money -- included, managed,
 * unknown -- rather than zero, which would read as free and sum as free.
 */
export interface CostComponent {
  readonly amountNanos: bigint | null;
  readonly classification: CostClassification;
  readonly component: "harness" | "model" | "platform" | "sandbox";
  readonly detail: Readonly<Record<string, unknown>>;
  readonly explanation: string;
  readonly source: string;
}

/** One eval unit per trial the platform accepted, failures included: a trial
 * that ran and failed consumed what a trial that ran and passed did. */
const PLATFORM_UNITS = 1;

const subscriptionAuth = new Set(["chatgpt", "legacy-auth-json"]);

/** How the harness was paid for, which decides whether its usage creates a
 * marginal charge at all. */
const connectionMode = (authMethodId: string | null) => {
  if (authMethodId === null) {
    return "unknown" as const;
  }

  return subscriptionAuth.has(authMethodId)
    ? ("subscription" as const)
    : ("api" as const);
};

const modelComponent = (input: {
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
    return {
      ...base,
      amountNanos: null,
      classification: "unknown",
      detail: tokens,
      explanation: `No published rate for ${input.model}, so its usage cannot be priced.`,
      source: "models.dev",
    };
  }

  const rate = input.price.value;

  /* An estimate even on a subscription: the tokens are real and the public
     rate is real, but what the account is billed is neither of those, and a
     subscription may charge nothing marginal at all. */
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

const harnessComponent = (input: {
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
    /* Never the model's cost: the harness is the agent runtime around the
       model, and copying one into the other doubles a run's reported spend. */
    explanation:
      mode === "unknown"
        ? "The connection this ran on is not recorded, so the harness cannot be priced."
        : `The ${input.harness} runtime bills nothing separately from the model it calls.`,
    source: "connection",
  };
};

const sandboxComponent = (input: {
  readonly hasOwnCredential: boolean;
  readonly provider: string;
  readonly sandboxMs: number;
}): CostComponent => ({
  amountNanos: null,
  /* A sandbox on our own provider account is one the customer is not billed
     for; one on theirs is billed by the provider, to them, and we see no
     amount for it. Neither is zero. */
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

const platformComponent = (): CostComponent => ({
  amountNanos: null,
  classification: "included",
  component: "platform",
  detail: { evalUnits: PLATFORM_UNITS },
  explanation: "Metered in eval units rather than priced per trial.",
  source: "platform",
});

/**
 * What a finished trial cost, layer by layer.
 *
 * Pure, over values the caller already holds: no store, no clock, no rate
 * lookup of its own. That keeps every classification rule testable as a table
 * rather than through a database.
 */
export const breakdownOf = (input: {
  readonly authMethodId: string | null;
  readonly harness: string;
  readonly hasOwnSandboxCredential: boolean;
  readonly model: string;
  readonly modelMs: number;
  readonly price: Option.Option<ModelPrice>;
  readonly provider: string;
  readonly sandboxMs: number;
  readonly usage: HarnessUsage | null;
}): readonly CostComponent[] => [
  modelComponent(input),
  harnessComponent(input),
  sandboxComponent({
    hasOwnCredential: input.hasOwnSandboxCredential,
    provider: input.provider,
    sandboxMs: input.sandboxMs,
  }),
  platformComponent(),
];
