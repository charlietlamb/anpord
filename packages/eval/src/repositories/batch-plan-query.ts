import { Database } from "@anpord/db/client";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalHarnessProfile } from "@anpord/db/schema/evals/eval-harness-profiles";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalVariant } from "@anpord/db/schema/evals/eval-variants";
import type { EvalUser } from "@anpord/schema/domain/eval-turns";
import type {
  CaseCache,
  EvalPrepare,
  EvalSource,
  EvalValidator,
} from "@anpord/schema/domain/evals";
import { eq } from "drizzle-orm";
import { Effect, Option } from "effect";
import type { HarnessName, ProviderName } from "../domain/cell";
import type { RequestedProfile } from "../domain/harness-profile";
import { namesOf } from "../domain/variant";
import { tryStore } from "./query";

export interface CasePlan {
  readonly cache: CaseCache | null;
  readonly id: string;
  readonly name: string;
  readonly prepare: EvalPrepare | null;
  readonly prompt: string;
  readonly source: EvalSource;
  readonly user: EvalUser | null;
  readonly validator: EvalValidator | null;
  readonly verify: string | null;
}

export interface RunPlan {
  readonly case: CasePlan;
  readonly harness: HarnessName;
  readonly harnessCredentialConnectionId: string | null;
  readonly harnessVersion: string;
  readonly internalId: string;
  readonly model: string;
  readonly profile: RequestedProfile | null;
  readonly sandbox: ProviderName;
  readonly sandboxCredentialConnectionId: string | null;
  readonly trialCount: number;
}

export interface BatchPlan {
  readonly internalId: string;
  readonly local: boolean;
  readonly organizationId: string;
  readonly runs: readonly RunPlan[];
}

export const batchPlanQuery = Effect.gen(function* () {
  const db = yield* Database;

  return (batchInternalId: string) =>
    Effect.gen(function* () {
      const rows = yield* tryStore("batchPlan.find", () =>
        db
          .select({
            batch: evalBatch,
            caseId: evalCase.id,
            caseName: evalCase.name,
            profile: evalHarnessProfile,
            run: evalRun,
            variant: evalVariant,
            version: evalCaseVersion,
          })
          .from(evalBatch)
          .innerJoin(evalRun, eq(evalRun.batchInternalId, evalBatch.internalId))
          .innerJoin(
            evalVariant,
            eq(evalVariant.internalId, evalRun.variantInternalId)
          )
          .innerJoin(
            evalCaseVersion,
            eq(evalCaseVersion.internalId, evalRun.caseVersionInternalId)
          )
          .innerJoin(
            evalCase,
            eq(evalCase.internalId, evalCaseVersion.caseInternalId)
          )
          .leftJoin(
            evalHarnessProfile,
            eq(evalHarnessProfile.internalId, evalRun.profileInternalId)
          )
          .where(eq(evalBatch.internalId, batchInternalId))
      );

      const [first] = rows;

      if (first === undefined) {
        return Option.none<BatchPlan>();
      }

      const runs = rows.flatMap((row): RunPlan[] =>
        Option.match(namesOf(row.variant), {
          onNone: () => [],
          onSome: (names) => [
            {
              case: {
                cache: row.version.cache,
                id: row.caseId,
                name: row.caseName,
                prepare: row.version.prepare,
                prompt: row.version.prompt,
                source: row.version.source,
                user: row.version.user,
                validator: row.version.validator,
                verify: row.version.verify,
              },
              harness: names.harness,
              harnessCredentialConnectionId:
                row.run.harnessCredentialConnectionId,
              harnessVersion: row.run.harnessVersion,
              internalId: row.run.internalId,
              model: row.variant.model,
              profile:
                row.profile === null
                  ? null
                  : {
                      env: row.profile.env,
                      files: row.profile.files,
                      install: row.profile.install,
                      name: row.profile.name,
                      run: row.profile.run,
                      systemPrompt: row.profile.systemPrompt,
                    },
              sandbox: names.sandbox,
              sandboxCredentialConnectionId:
                row.run.sandboxCredentialConnectionId,
              trialCount: row.run.trialCount,
            },
          ],
        })
      );

      return Option.some<BatchPlan>({
        internalId: first.batch.internalId,
        local: first.batch.local,
        organizationId: first.batch.organizationId,
        runs,
      });
    }).pipe(
      Effect.withSpan("BatchPlanQuery.find", {
        attributes: { batchId: batchInternalId },
      })
    );
});
