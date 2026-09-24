import { Effect, Layer } from "effect";
import { type ScoreRequest, Scorer } from "../../ports/scorer";
import { scoreCommand } from "./command-score";
import { writeAnswer } from "./validator-protocol";
import { scoreValidator } from "./validator-score";

export const ScorerGroundTruthLive = Layer.succeed(
  Scorer,
  Scorer.of({
    score: (request: ScoreRequest) =>
      writeAnswer(request.sandbox, request.events, request.turns).pipe(
        Effect.flatMap(() =>
          request.validator != null && "source" in request.validator
            ? scoreValidator({ ...request, validator: request.validator })
            : scoreCommand(request)
        ),
        Effect.withSpan("Scorer.score")
      ),
  })
);
