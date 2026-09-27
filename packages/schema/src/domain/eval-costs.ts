import { Schema } from "effect";

export const CostClassification = Schema.Literal(
  "actual",
  "allocated",
  "estimate",
  "included",
  "managed",
  "unknown"
);
export type CostClassification = typeof CostClassification.Type;

export const CostComponentName = Schema.Literal(
  "judge",
  "harness",
  "model",
  "platform",
  "sandbox",
  "user"
);
export type CostComponentName = typeof CostComponentName.Type;

export const COST_COMPONENT_LABELS: Readonly<
  Record<CostComponentName, string>
> = {
  harness: "harness",
  judge: "judges",
  model: "model",
  platform: "platform",
  sandbox: "sandbox",
  user: "simulated user",
};

export const EvalCostComponent = Schema.Struct({
  classification: CostClassification,
  component: CostComponentName,
  detail: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  explanation: Schema.String,
  source: Schema.String,
  usd: Schema.NullOr(Schema.Number),
}).annotations({
  description: "What one layer of a trial cost, and how far that is known.",
  identifier: "EvalCostComponent",
});
export type EvalCostComponent = typeof EvalCostComponent.Type;

const LEGACY_COMPONENT_NAMES: readonly string[] = [
  "judge",
  "harness",
  "model",
  "platform",
  "sandbox",
];

const WireCostComponent = Schema.Struct({
  ...EvalCostComponent.fields,
  classification: Schema.String,
  component: Schema.String,
});
type WireCostComponent = typeof WireCostComponent.Type;

const isComponentName = Schema.is(CostComponentName);
const isClassification = Schema.is(CostClassification);

const readComponent = (
  part: WireCostComponent
): readonly EvalCostComponent[] =>
  isComponentName(part.component)
    ? [
        {
          ...part,
          classification: isClassification(part.classification)
            ? part.classification
            : "unknown",
          component: part.component,
        },
      ]
    : [];

const costTotals = {
  allocatedUsd: Schema.Number,
  estimatedEquivalentUsd: Schema.Number,
  incomplete: Schema.Boolean,
  knownActualUsd: Schema.Number,
};

export const EvalCosts = Schema.transform(
  Schema.Struct({
    ...costTotals,
    components: Schema.Array(WireCostComponent),
    laterComponents: Schema.optionalWith(Schema.Array(WireCostComponent), {
      default: () => [],
    }).annotations({
      description:
        "Components named after anpord 0.1.25, kept out of `components` so clients from then still decode the response.",
    }),
  }),
  Schema.Struct({
    ...costTotals,
    components: Schema.Array(Schema.typeSchema(EvalCostComponent)),
  }),
  {
    strict: true,
    decode: ({ components, laterComponents, ...totals }) => ({
      ...totals,
      components: [...components, ...laterComponents].flatMap(readComponent),
    }),
    encode: ({ components, ...totals }) => ({
      ...totals,
      components: components.filter(({ component }) =>
        LEGACY_COMPONENT_NAMES.includes(component)
      ),
      laterComponents: components.filter(
        ({ component }) => !LEGACY_COMPONENT_NAMES.includes(component)
      ),
    }),
  }
).annotations({
  description: "Cost by component, kept apart by classification.",
  identifier: "EvalCosts",
});
export type EvalCosts = typeof EvalCosts.Type;
