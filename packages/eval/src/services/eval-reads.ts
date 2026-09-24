import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalVariant } from "@anpord/db/schema/evals/eval-variants";
import type { EvalTailMark } from "@anpord/schema/domain/eval-tail";
import {
  type EvalArtifactRequest,
  type EvalPageCursor,
  RUN_PAGE_SIZE,
} from "@anpord/schema/domain/evals";
import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";
import { EvalNotFound } from "../domain/errors";
import { batchReadsQuery } from "../repositories/batch-reads-query";
import { batchScopeQuery } from "../repositories/batch-scope-query";
import {
  caseReadsQuery,
  type ListCases,
} from "../repositories/case-reads-query";
import { runReadsQuery } from "../repositories/run-reads-query";
import { tailQuery } from "../repositories/tail-query";
import { trialAddressQuery } from "../repositories/trial-address-query";
import { trialArtifactQuery } from "../repositories/trial-artifacts";

const found = <A>(
  effect: Effect.Effect<Option.Option<A>, unknown>,
  missing: () => EvalNotFound
) =>
  effect.pipe(
    Effect.orDie,
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.fail(missing()),
        onSome: Effect.succeed,
      })
    )
  );

export const make = Effect.gen(function* () {
  const batches = yield* batchReadsQuery;
  const cases = yield* caseReadsQuery;
  const runs = yield* runReadsQuery;
  const tail = yield* tailQuery;
  const address = yield* trialAddressQuery;
  const artifact = yield* trialArtifactQuery;
  const scope = yield* batchScopeQuery;

  return {
    artifact: (organizationId: string, input: EvalArtifactRequest) =>
      found(
        artifact(organizationId, input),
        () => new EvalNotFound({ entity: "artifact", id: input.path })
      ),
    batch: (organizationId: string, id: string) =>
      found(
        batches.get(organizationId, id),
        () => new EvalNotFound({ entity: "batch", id })
      ),
    ownedBatch: (organizationId: string, id: string) =>
      found(
        scope.batch(organizationId, id),
        () => new EvalNotFound({ entity: "batch", id })
      ),
    batches: (input: {
      readonly cursor: EvalPageCursor | null;
      readonly limit: number | undefined;
      readonly organizationId: string;
    }) => batches.list(input).pipe(Effect.orDie),
    case: (organizationId: string, id: string) =>
      found(
        cases.detail(organizationId, id),
        () => new EvalNotFound({ entity: "case", id })
      ),
    caseRuns: (input: {
      readonly caseId: string;
      readonly organizationId: string;
      readonly page: number;
      readonly variant: string | null;
    }) =>
      Effect.gen(function* () {
        const where = {
          events: false,
          organizationId: input.organizationId,
          where: and(
            eq(evalCase.id, input.caseId),
            input.variant === null
              ? undefined
              : eq(evalVariant.internalId, input.variant)
          ),
        };
        const page = Math.max(input.page, 1);
        const [held, total] = yield* Effect.all(
          [
            runs.find({
              ...where,
              limit: RUN_PAGE_SIZE,
              offset: (page - 1) * RUN_PAGE_SIZE,
            }),
            runs.total(where),
          ],
          { concurrency: 2 }
        );
        return { page, pageSize: RUN_PAGE_SIZE, runs: held, total };
      }).pipe(Effect.orDie, Effect.withSpan("EvalReads.caseRuns")),
    cases: (input: ListCases) => cases.list(input).pipe(Effect.orDie),
    run: (organizationId: string, id: string) =>
      found(
        runs
          .find({
            events: true,
            organizationId,
            where: eq(evalRun.internalId, id),
          })
          .pipe(Effect.map((held) => Option.fromNullable(held[0]))),
        () => new EvalNotFound({ entity: "run", id })
      ),
    tail: (input: {
      readonly after: readonly EvalTailMark[];
      readonly batchId: string;
      readonly organizationId: string;
    }) =>
      found(
        tail(input),
        () => new EvalNotFound({ entity: "batch", id: input.batchId })
      ),
    trialAddress: (organizationId: string, trialId: string) =>
      found(
        address(organizationId, trialId),
        () => new EvalNotFound({ entity: "trial", id: trialId })
      ),
  };
});

export class EvalReads extends Context.Tag("@anpord/eval/EvalReads")<
  EvalReads,
  Effect.Effect.Success<typeof make>
>() {}

export const EvalReadsLive = Layer.effect(EvalReads, make);
