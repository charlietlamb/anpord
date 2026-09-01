import { describe, expect, test } from "bun:test";
import { Option } from "effect";
import {
  breakdownOf,
  type CostComponent,
  costsOf,
  nanosOf,
  rollUp,
  summaryOf,
} from "../../src/domain/trial-cost";

const RATE = { cacheRead: 0.3, cacheWrite: 3.75, input: 3, output: 15 };

const USAGE = {
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  costUsd: undefined,
  inputTokens: 1_000_000,
  outputTokens: 0,
  totalTokens: 1_000_000,
};

const breakdown = (over: Partial<Parameters<typeof breakdownOf>[0]> = {}) =>
  breakdownOf({
    authMethodId: "api-key",
    harness: "codex",
    hasOwnSandboxCredential: false,
    model: "gpt-5.1-codex",
    modelMs: 5000,
    price: Option.some(RATE),
    provider: "daytona",
    sandboxMs: 12_000,
    usage: USAGE,
    ...over,
  });

const find = (parts: readonly CostComponent[], name: string) =>
  parts.find((part) => part.component === name) as CostComponent;

describe("what a trial cost", () => {
  test("reports every layer, so nothing is silently absent", () => {
    expect(
      breakdown()
        .map((part) => part.component)
        .sort()
    ).toEqual(["harness", "model", "platform", "sandbox"]);
  });
});

describe("the model layer", () => {
  test("is an estimate even at a published rate, never an invoice", () => {
    expect(find(breakdown(), "model").classification).toBe("estimate");
  });

  test("prices a million input tokens at the rate per million", () => {
    expect(find(breakdown(), "model").amountNanos).toBe(nanosOf(3));
  });

  test("keeps the rate it used, so a later price change cannot rewrite it", () => {
    expect(find(breakdown(), "model").detail.rateSnapshot).toEqual(RATE);
  });

  /* A total that quietly drops an unpriced model reads as complete and is
     not. Null is the only honest answer. */
  test("is unknown, not zero, when the model publishes no rate", () => {
    const model = find(breakdown({ price: Option.none() }), "model");

    expect(model.classification).toBe("unknown");
    expect(model.amountNanos).toBeNull();
  });

  test("is unknown when the harness reported no usage at all", () => {
    const model = find(breakdown({ usage: null }), "model");

    expect(model.classification).toBe("unknown");
    expect(model.amountNanos).toBeNull();
  });

  test("says so when the usage counts against a subscription", () => {
    const model = find(breakdown({ authMethodId: "chatgpt" }), "model");

    expect(model.classification).toBe("estimate");
    expect(model.explanation).toContain("subscription");
  });
});

describe("the harness layer", () => {
  /* The harness is the runtime around the model, not the model. Copying one
     into the other doubles what a run appears to have cost. */
  test("never carries the model's amount", () => {
    expect(find(breakdown(), "harness").amountNanos).toBeNull();
  });

  test("is included when the connection is known", () => {
    expect(find(breakdown(), "harness").classification).toBe("included");
  });

  test("is unknown when no connection was recorded", () => {
    expect(
      find(breakdown({ authMethodId: null }), "harness").classification
    ).toBe("unknown");
  });
});

describe("the sandbox layer", () => {
  test("is managed when it ran on our own provider account", () => {
    const sandbox = find(breakdown(), "sandbox");

    expect(sandbox.classification).toBe("managed");
    expect(sandbox.amountNanos).toBeNull();
  });

  test("is unknown when it ran on the customer's, who is billed elsewhere", () => {
    const sandbox = find(
      breakdown({ hasOwnSandboxCredential: true }),
      "sandbox"
    );

    expect(sandbox.classification).toBe("unknown");
    expect(sandbox.amountNanos).toBeNull();
  });

  test("keeps the time it was open, which is what a rate would price", () => {
    expect(find(breakdown(), "sandbox").detail.billableDurationMs).toBe(12_000);
  });
});

describe("the platform layer", () => {
  test("counts a unit for the trial rather than pricing one", () => {
    const platform = find(breakdown(), "platform");

    expect(platform.detail.evalUnits).toBe(1);
    expect(platform.amountNanos).toBeNull();
  });
});

describe("what is never reported", () => {
  /* Zero reads as free, and free is a claim. Nothing unpriced may make it. */
  test("no layer reports zero for something it could not price", () => {
    const unpriced = breakdown({ price: Option.none(), usage: null }).filter(
      (part) => part.classification !== "estimate"
    );

    expect(unpriced.every((part) => part.amountNanos === null)).toBe(true);
  });
});

const priced = (
  classification: CostComponent["classification"],
  usd: number | null
): CostComponent => ({
  amountNanos: usd === null ? null : nanosOf(usd),
  classification,
  component: "model",
  detail: {},
  explanation: "",
  source: "test",
});

describe("what a set of trials cost", () => {
  /* Three sums rather than one: an estimate added to a charge and an allocated
     share is a number that means none of the three. */
  test("keeps each basis apart rather than adding them together", () => {
    const summary = summaryOf([
      priced("estimate", 4.09),
      priced("actual", 1.5),
      priced("allocated", 0.25),
    ]);

    expect(summary.estimatedEquivalentUsd).toBeCloseTo(4.09, 6);
    expect(summary.knownActualUsd).toBeCloseTo(1.5, 6);
    expect(summary.allocatedUsd).toBeCloseTo(0.25, 6);
  });

  /* The reason for integers: a hundred trials of a third of a cent each is a
     number a float cannot hold and cents cannot express. */
  test("sums fractions of a cent without drift", () => {
    const summary = summaryOf(
      Array.from({ length: 100 }, () => priced("estimate", 0.003_33))
    );

    expect(summary.estimatedEquivalentUsd).toBeCloseTo(0.333, 9);
  });

  test("is incomplete when something could not be priced", () => {
    expect(summaryOf([priced("unknown", null)]).incomplete).toBe(true);
  });

  /* A managed sandbox is the ordinary case, so raising the flag for it would
     leave it on for every run and tell nobody anything. */
  test("is not incomplete merely because a cost is managed or included", () => {
    const summary = summaryOf([
      priced("estimate", 1),
      priced("managed", null),
      priced("included", null),
    ]);

    expect(summary.incomplete).toBe(false);
  });

  test("counts nothing for a component with no amount", () => {
    expect(summaryOf([priced("managed", null)]).estimatedEquivalentUsd).toBe(0);
  });
});

const stored = (classification: string, usd: number | null) => [
  {
    amountNanos: usd === null ? null : nanosOf(usd),
    classification,
    component: "model",
    detail: {},
    explanation: "",
    source: "test",
  },
];

describe("what a cell or run cost", () => {
  test("adds the estimates of the trials under it", () => {
    const total = rollUp([
      costsOf(stored("estimate", 0.11)),
      costsOf(stored("estimate", 0.13)),
    ]);

    expect(total?.estimatedEquivalentUsd).toBeCloseTo(0.24, 6);
  });

  /* A cell where one trial was priced and another was not is not partly
     estimated: the figure it can show is less than what it spent. */
  test("is unknown where its trials disagree, not partly estimated", () => {
    const total = rollUp([
      costsOf(stored("estimate", 0.11)),
      costsOf(stored("unknown", null)),
    ]);

    expect(total?.components[0]?.classification).toBe("unknown");
    expect(total?.incomplete).toBe(true);
  });

  /* Thirty-six managed sandboxes are not thirty-six times zero. */
  test("keeps an unpriced layer unpriced however many there are", () => {
    const total = rollUp([
      costsOf(stored("managed", null)),
      costsOf(stored("managed", null)),
    ]);

    expect(total?.components[0]?.usd).toBeNull();
  });

  test("is absent when nothing under it priced anything", () => {
    expect(rollUp([null, null])).toBeNull();
  });
});

describe("a credential that names no model", () => {
  /* A ChatGPT subscription picks the model itself and reports no name, so
     there is nothing to look a rate up by. Blaming the catalogue for that
     would point a reader at the wrong thing entirely. */
  test("says the connection chose it, not that the catalogue lacks it", () => {
    const model = find(breakdown({ model: "", price: Option.none() }), "model");

    expect(model.classification).toBe("unknown");
    expect(model.explanation).toContain("chose its own model");
  });
});
