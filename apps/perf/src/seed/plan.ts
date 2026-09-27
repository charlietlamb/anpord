import type {
  EvalCase,
  EvalVariantRequest,
  StartBatchRequest,
} from "@anpord/schema/domain/eval-definition";
import { MAX_RUN_TRIALS } from "@anpord/schema/domain/eval-quota";

export interface SeedPlan {
  readonly batchesPerSuite: number;
  readonly casesPerSuite: number;
  readonly eventsPerTrial: number;
  readonly largeJournalEvents: number;
  readonly prompts: number;
  readonly seed: number;
  readonly suites: number;
  readonly trials: number;
  readonly variants: number;
}

export const DEFAULT_PLAN: SeedPlan = {
  batchesPerSuite: 3,
  casesPerSuite: 10,
  eventsPerTrial: 40,
  largeJournalEvents: 4000,
  prompts: 20,
  seed: 20_260_927,
  suites: 6,
  trials: 3,
  variants: 3,
};

export const LARGE_SUITE = "perf-large-journal";

export const assertPlanFits = (plan: SeedPlan) => {
  const trials = plan.casesPerSuite * plan.variants * plan.trials;
  if (trials > MAX_RUN_TRIALS) {
    throw new Error(
      `The seed plan asks for ${trials} trials per batch, and a batch may hold ${MAX_RUN_TRIALS}.`
    );
  }
};

const caseOf = (template: EvalCase, id: string, tag: string): EvalCase => ({
  ...template,
  id: id as EvalCase["id"],
  name: id,
  tags: [tag],
});

const variantOf = (
  template: EvalVariantRequest,
  index: number
): EvalVariantRequest => ({ ...template, model: `perf-model-${index}` });

export const suiteRequest = (
  template: StartBatchRequest,
  suite: string,
  cases: number,
  variants: number,
  trials: number
): StartBatchRequest => {
  const [firstCase] = template.cases;
  const [firstVariant] = template.variants;
  if (firstCase === undefined || firstVariant === undefined) {
    throw new Error("The template suite needs a case and a variant.");
  }
  return {
    ...template,
    cases: Array.from({ length: cases }, (_, index) =>
      caseOf(firstCase, `${suite}-c${index}`, index % 2 === 0 ? "even" : "odd")
    ),
    checksIn: false,
    local: true,
    suite: { ...template.suite, id: suite, name: suite },
    trials,
    variants: Array.from({ length: variants }, (_, index) =>
      variantOf(firstVariant, index)
    ),
  };
};
