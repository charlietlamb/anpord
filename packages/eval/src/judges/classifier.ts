import type { EvalClassifier } from "@anpord/schema/domain/eval-classifiers";
import { Clock, Context, Effect, Layer } from "effect";
import {
  type ClassifierAnswer,
  classificationOutcome,
} from "../domain/classification";
import type { JudgeFailed } from "./model";
import { type ClassifyRequest, makeTypeSafeClassifier } from "./typesafe";

export class Classifier extends Context.Tag("@anpord/eval/Classifier")<
  Classifier,
  {
    readonly classify: (
      request: ClassifyRequest
    ) => Effect.Effect<ClassifierAnswer, JudgeFailed>;
  }
>() {}

export const ClassifierLive = Layer.effect(
  Classifier,
  Effect.gen(function* () {
    const typesafe = yield* makeTypeSafeClassifier;

    return Classifier.of({ classify: typesafe });
  })
);

/* An unreachable classifier is recorded rather than raised: a case that could
   not be classified has not passed, and the run says why. */
export const classifyCase = (request: ClassifyRequest) =>
  Effect.gen(function* () {
    const started = yield* Clock.currentTimeMillis;
    const classifier = yield* Classifier;
    const answer = yield* classifier.classify(request).pipe(Effect.either);
    const finished = yield* Clock.currentTimeMillis;
    const durationMs = Math.max(0, finished - started);

    if (answer._tag === "Left") {
      return failedClassification(
        request.classifier,
        answer.left.message,
        durationMs
      );
    }

    return classificationOutcome(request.classifier, answer.right, durationMs);
  });

const failedClassification = (
  classifier: EvalClassifier,
  message: string,
  durationMs: number
) => ({
  choice: null,
  confidence: null,
  durationMs,
  error: message,
  expected: classifier.expect,
  minConfidence: classifier.minConfidence,
  model: classifier.model,
  name: classifier.name,
  probabilities: {},
});
