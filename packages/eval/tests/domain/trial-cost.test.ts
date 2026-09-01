import { describe, expect, test } from "bun:test";
import { Option } from "effect";
import {
  breakdownOf,
  type CostComponent,
  nanosOf,
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
