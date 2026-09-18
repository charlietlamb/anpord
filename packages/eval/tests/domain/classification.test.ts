import { describe, expect, it } from "bun:test";
import { EvalClassifier } from "@anpord/schema/domain/eval-classifiers";
import { Schema } from "effect";
import {
  type ClassifierAnswer,
  classificationOutcome,
  classificationPassed,
} from "../../src/domain/classification";

const classifier = (overrides: Record<string, unknown> = {}) =>
  Schema.decodeUnknownSync(EvalClassifier)({
    kind: "classifier",
    model: "jev-latest",
    name: "routed correctly",
    options: {
      billing: "Charges, invoices, payment problems",
      returns: "Exchanges, refunds, wrong or damaged items",
    },
    prompt: "Which team should handle this?",
    expect: "returns",
    ...overrides,
  });

const answer = (
  overrides: Partial<ClassifierAnswer> = {}
): ClassifierAnswer => ({
  choice: "returns",
  confidence: 0.94,
  model: "jev-latest",
  probabilities: { billing: 0.06, returns: 0.94 },
  ...overrides,
});

const outcome = (
  config: Record<string, unknown> = {},
  result: Partial<ClassifierAnswer> = {}
) => classificationOutcome(classifier(config), answer(result), 12);

describe("classificationPassed", () => {
  it("passes when the expected label wins above the floor", () => {
    expect(classificationPassed(outcome({ minConfidence: 0.8 }))).toBe(true);
  });

  it("fails when another label wins", () => {
    const failed = outcome(
      {},
      { choice: "billing", probabilities: { billing: 0.91, returns: 0.09 } }
    );

    expect(classificationPassed(failed)).toBe(false);
  });

  /* The label is right, so only the floor separates this from a pass: the
     model could not tell the options apart and said so. */
  it("fails when the expected label wins below the floor", () => {
    const unsure = outcome(
      { minConfidence: 0.9 },
      { confidence: 0.51, probabilities: { billing: 0.49, returns: 0.51 } }
    );

    expect(classificationPassed(unsure)).toBe(false);
  });

  it("passes at exactly the floor", () => {
    const exact = outcome({ minConfidence: 0.75 }, { confidence: 0.75 });

    expect(classificationPassed(exact)).toBe(true);
  });

  it("never passes an errored classification", () => {
    expect(
      classificationPassed({ ...outcome(), error: "TypeSafe was unreachable" })
    ).toBe(false);
  });

  /* A run that did not classify must not count as agreement. */
  it("never passes without a confidence", () => {
    expect(
      classificationPassed({ ...outcome(), choice: null, confidence: null })
    ).toBe(false);
  });
});

describe("EvalClassifier", () => {
  it("defaults the floor to zero, so a bare classifier judges the label alone", () => {
    expect(classifier().minConfidence).toBe(0);
  });

  it("refuses an expectation that is not one of its options", () => {
    expect(() => classifier({ expect: "shipping" })).toThrow();
  });

  it("refuses a single option, which decides nothing", () => {
    expect(() => classifier({ options: { returns: null } })).toThrow();
  });

  it("keeps the distribution the model returned", () => {
    expect(outcome().probabilities).toEqual({ billing: 0.06, returns: 0.94 });
  });
});
