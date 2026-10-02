import type { Actor } from "@sphynx/schema/domain/actor";
import type { RerunIntent, RerunPlan } from "@sphynx/schema/domain/eval-rerun";
import { Effect, Option } from "effect";
import { EvalNotFound } from "../domain/errors";
import { planRerun } from "../domain/rerun-plan";
import {
  type SuiteRerunRows,
  suiteRerunQuery,
} from "../repositories/suite-rerun-query";

export interface RerunPlanInput {
  readonly actor: Actor;
  readonly intent: RerunIntent;
  readonly suiteId: string;
}

export interface PlannedRerun {
  readonly plan: RerunPlan;
  readonly rows: SuiteRerunRows;
}

export const makeRerunPlan = Effect.gen(function* () {
  const suiteRows = yield* suiteRerunQuery;

  return (input: RerunPlanInput) =>
    Effect.gen(function* () {
      const found = yield* suiteRows({
        organizationId: input.actor.organizationId,
        suiteId: input.suiteId,
      }).pipe(Effect.orDie);

      if (Option.isNone(found)) {
        return yield* new EvalNotFound({ entity: "suite", id: input.suiteId });
      }

      const rows = found.value;

      return {
        plan: planRerun({
          candidates: rows.cases.map((subject) => subject.candidate),
          intent: input.intent,
          suite: rows.suite,
        }),
        rows,
      } satisfies PlannedRerun;
    }).pipe(
      Effect.withSpan("Batches.planRerun", {
        attributes: { scope: input.intent.scope, suiteId: input.suiteId },
      }),
      Effect.annotateLogs({ organizationId: input.actor.organizationId })
    );
});
