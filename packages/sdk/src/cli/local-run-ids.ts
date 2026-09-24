import type {
  EvalVariantRequest,
  StartBatchRequest,
} from "@anpord/schema/domain/eval-definition";
import type {
  EvalBatch,
  EvalVariant,
  StartedBatch,
} from "@anpord/schema/domain/evals";
import { Data, Effect } from "effect";
import { type LocalSlot, labelOfRequest } from "./eval-local";

class UnmatchedRun extends Data.TaggedError("UnmatchedRun")<{
  readonly batchId: string;
  readonly caseId: string;
  readonly variant: string;
}> {
  override get message() {
    return `Batch ${this.batchId} has no run for ${this.caseId} on ${this.variant}, so its trials cannot be recorded.`;
  }
}

const sameVariant = (stored: EvalVariant, requested: EvalVariantRequest) =>
  stored.harness === requested.harness &&
  stored.model === requested.model &&
  stored.sandbox === requested.sandbox &&
  stored.profile === (requested.profile?.name ?? null);

export const runIdsFor = (
  request: StartBatchRequest,
  started: StartedBatch,
  batch: EvalBatch
) =>
  Effect.gen(function* () {
    const ids = new Map<EvalVariantRequest, Map<string, string>>();

    for (const variant of request.variants) {
      const byCase = new Map<string, string>();
      for (const subject of request.cases) {
        const variantId = batch.runs.find(
          (run) =>
            run.case.id === subject.id && sameVariant(run.variant, variant)
        )?.variant.id;
        const runId = started.runs.find(
          (run) => run.caseId === subject.id && run.variantId === variantId
        )?.id;
        if (runId === undefined) {
          return yield* new UnmatchedRun({
            batchId: started.id,
            caseId: subject.id,
            variant: labelOfRequest(variant),
          });
        }
        byCase.set(subject.id, runId);
      }
      ids.set(variant, byCase);
    }

    return (slot: LocalSlot) => ids.get(slot.variant)?.get(slot.caseId) ?? "";
  });
