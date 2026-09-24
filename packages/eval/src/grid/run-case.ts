import type { Actor } from "@anpord/schema/domain/actor";
import { authorIdOf } from "@anpord/schema/domain/actor";
import type { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import type { StartedBatch } from "@anpord/schema/domain/evals";
import { Effect, Option } from "effect";
import { CredentialResolver } from "../credentials/resolver";
import { bindCredentials } from "../credentials/variants";
import { EvalNotFound, NotRunnable } from "../domain/errors";
import { caseTemplatesQuery } from "../repositories/case-templates-query";
import type { Launch } from "./launch";

export interface RunCase {
  readonly actor: Actor;
  readonly caseId: string;
  readonly hostedOnly: boolean;
  readonly trials: number;
  readonly trigger: EvalTrigger;
  readonly variantId: string | null;
}

export const makeRunCase = (
  launch: (input: Launch) => Effect.Effect<{
    readonly internalId: string;
    readonly runInternalIds: readonly string[];
  }, unknown>
) =>
  Effect.gen(function* () {
    const credentials = yield* CredentialResolver;
    const templates = yield* caseTemplatesQuery;

    return (input: RunCase) =>
      Effect.gen(function* () {
        const found = yield* templates({
          caseId: input.caseId,
          organizationId: input.actor.organizationId,
          variantId: input.variantId,
        }).pipe(Effect.orDie);

        if (Option.isNone(found)) {
          return yield* new EvalNotFound({ entity: "case", id: input.caseId });
        }

        const { caseVersionInternalId, runs } = found.value;

        if (runs.length === 0) {
          return yield* new NotRunnable({
            id: input.caseId,
            problems: ["this case has not run on that variant"],
          });
        }

        if (input.hostedOnly && runs.some((run) => run.sandbox === "local")) {
          return yield* new NotRunnable({
            id: input.caseId,
            problems: ["a local run can only be repeated from its own machine"],
          });
        }

        const bound = yield* bindCredentials(
          credentials,
          input.actor,
          runs.map((run) => ({
            credentials: {
              harnessConnectionId:
                run.harnessCredentialConnectionId ?? undefined,
              sandboxConnectionId:
                run.sandboxCredentialConnectionId ?? undefined,
            },
            harness: run.harness,
            sandbox: run.sandbox,
          }))
        );

        const created = yield* launch({
          local: false,
          organizationId: input.actor.organizationId,
          runs: runs.map((run, index) => ({
            ...(bound[index] ?? {
              harnessCredentialConnectionId: null,
              harnessCredentialRevision: null,
              sandboxCredentialConnectionId: null,
              sandboxCredentialRevision: null,
            }),
            caseVersionInternalId,
            harnessVersion: run.harnessVersion,
            profileInternalId: run.profileInternalId,
            trialCount: input.trials,
            variantInternalId: run.variantInternalId,
          })),
          startedBy: authorIdOf(input.actor),
          trigger: input.trigger,
        }).pipe(Effect.orDie);

        return {
          id: created.internalId,
          runs: runs.map((_, index) => ({
            caseId: input.caseId,
            id: created.runInternalIds[index] ?? "",
            variantIndex: index,
          })),
        } satisfies StartedBatch;
      }).pipe(
        Effect.withSpan("Batches.runCase", {
          attributes: { caseId: input.caseId, trials: input.trials },
        }),
        Effect.annotateLogs({ organizationId: input.actor.organizationId })
      );
  });
