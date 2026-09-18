import type {
  EvalClassification,
  EvalClassifier,
} from "@anpord/schema/domain/eval-classifiers";

export interface ClassifierAnswer {
  readonly choice: string;
  readonly confidence: number;
  readonly model: string;
  readonly probabilities: Readonly<Record<string, number>>;
}

export const classificationOutcome = (
  classifier: EvalClassifier,
  answer: ClassifierAnswer,
  durationMs: number
): EvalClassification => ({
  choice: answer.choice,
  confidence: answer.confidence,
  durationMs,
  error: null,
  expected: classifier.expect,
  minConfidence: classifier.minConfidence,
  model: answer.model,
  name: classifier.name,
  probabilities: answer.probabilities,
});

/* A wrong label is disagreement; the right label below the floor is the model
   saying it could not separate the options. Both fail, and the distribution
   beside them says which happened. */
export const classificationPassed = (
  classification: EvalClassification
): boolean =>
  classification.error === null &&
  classification.choice === classification.expected &&
  classification.confidence !== null &&
  classification.confidence >= classification.minConfidence;
