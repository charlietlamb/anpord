import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { EvalCosts } from "../../src/domain/evals";

const line = (component: string, classification = "estimate") => ({
  classification,
  component,
  detail: {},
  explanation: "",
  source: "models.dev",
  usd: 0.5,
});

const totals = {
  allocatedUsd: 0,
  estimatedEquivalentUsd: 1.5,
  incomplete: false,
  knownActualUsd: 0,
};

describe("cost components on the wire", () => {
  it("keeps a component named after 0.1.25 out of the list those clients decode", () => {
    const wire = Schema.encodeSync(EvalCosts)({
      ...totals,
      components: [line("model"), line("user")] as never,
    });

    expect([
      wire.components.map(({ component }) => component),
      wire.laterComponents?.map(({ component }) => component),
    ]).toEqual([["model"], ["user"]]);
  });

  it("reads a response naming a component this client has never heard of", () => {
    const read = Schema.decodeUnknownSync(EvalCosts)({
      ...totals,
      components: [line("model")],
      laterComponents: [line("user"), line("carbon-offset")],
    });

    expect(read.components.map(({ component }) => component)).toEqual([
      "model",
      "user",
    ]);
  });

  it("reads a classification it does not know as unknown", () => {
    const read = Schema.decodeUnknownSync(EvalCosts)({
      ...totals,
      components: [line("model", "amortized")],
    });

    expect(read.components.map(({ classification }) => classification)).toEqual(
      ["unknown"]
    );
  });
});
