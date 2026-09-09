import { getEvalArtifact as readArtifact } from "@anpord/eval/repositories/trial-artifacts";
import type { EvalArtifactRequest } from "@anpord/schema/domain/evals";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { Effect } from "effect";

export const getEvalArtifact = (input: EvalArtifactRequest) =>
  Effect.gen(function* () {
    const actor = yield* CurrentActor;
    return yield* readArtifact(actor.organizationId, input);
  });
