import type { HarnessUsage } from "@anpord/schema/domain/harness-event";
import { Option } from "effect";
import { toNanos } from "./cost-arithmetic";
import type { CostComponent } from "./cost-component";
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
    cacheWrite1hTokens: input.usage.cacheWrite1hTokens ?? null,
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
    amountNanos: toNanos(costOf(input.usage, rate)),
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

const onMachine = (sandboxMs: number): CostComponent => ({
  amountNanos: null,
  classification: "included",
  component: "sandbox",
  detail: {
    billableDurationMs: sandboxMs,
    connectionMode: "local",
    provider: "local",
    sessions: 1,
  },
  explanation: "Ran on your own machine, so nothing is billed for it.",
  source: "connection",
});

export const sandboxComponent = (input: {
  readonly hasOwnCredential: boolean;
  readonly provider: string;
  readonly sandboxMs: number;
}): CostComponent =>
  input.provider === "local"
    ? onMachine(input.sandboxMs)
    : {
        amountNanos: null,
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
      };

export const platformComponent = (): CostComponent => ({
  amountNanos: null,
  classification: "included",
  component: "platform",
  detail: { evalUnits: PLATFORM_UNITS },
  explanation: "Metered in eval units rather than priced per trial.",
  source: "platform",
});

export interface PricedSpend {
  readonly model: string;
  readonly price: Option.Option<ModelPrice>;
  readonly usage: HarnessUsage | null;
}

const SPENDERS = {
  judge: {
    priced:
      "What the judges used, priced at each model's published rate when the trial ran.",
    unreported: "A judge reported no usage, so judging cannot be fully priced.",
  },
  user: {
    priced:
      "What the simulated user used, priced at its model's published rate when the trial ran.",
    unreported:
      "The simulated user reported no usage, so it cannot be fully priced.",
  },
} as const;

const tokensOf = (spend: PricedSpend) => ({
  cacheReadTokens: spend.usage?.cacheReadTokens ?? null,
  cacheWrite1hTokens: spend.usage?.cacheWrite1hTokens ?? null,
  cacheWriteTokens: spend.usage?.cacheWriteTokens ?? null,
  inputTokens: spend.usage?.inputTokens ?? null,
  model: spend.model,
  outputTokens: spend.usage?.outputTokens ?? null,
  rateSnapshot: Option.getOrNull(spend.price),
  totalTokens: spend.usage?.totalTokens ?? null,
});

const unpricedBecause = (
  component: keyof typeof SPENDERS,
  spends: readonly PricedSpend[]
) => {
  if (spends.some((spend) => spend.usage === null)) {
    return SPENDERS[component].unreported;
  }

  const unrated = spends.find((spend) => Option.isNone(spend.price));

  return unrated === undefined
    ? null
    : `No published rate for ${unrated.model}, so its usage cannot be priced.`;
};

export const spendComponent = (
  component: keyof typeof SPENDERS,
  spends: readonly PricedSpend[]
): CostComponent => {
  const detail = { spends: spends.map(tokensOf) };
  const because = unpricedBecause(component, spends);

  if (because !== null) {
    return {
      amountNanos: null,
      classification: "unknown",
      component,
      detail,
      explanation: because,
      source: "models.dev",
    };
  }

  const nanos = spends.flatMap(({ price, usage }) =>
    usage === null
      ? []
      : Option.toArray(
          Option.map(price, (rate) => toNanos(costOf(usage, rate)))
        )
  );

  return {
    amountNanos: nanos.reduce((total, each) => total + each, 0n),
    classification: "estimate",
    component,
    detail,
    explanation: SPENDERS[component].priced,
    source: "models.dev",
  };
};
