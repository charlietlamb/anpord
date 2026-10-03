import { Database } from "@sphynx/db/client";
import { evalBatch } from "@sphynx/db/schema/evals/eval-batches";
import { evalCaseVersion } from "@sphynx/db/schema/evals/eval-case-versions";
import { evalCase } from "@sphynx/db/schema/evals/eval-cases";
import { evalHarnessProfile } from "@sphynx/db/schema/evals/eval-harness-profiles";
import { evalRun } from "@sphynx/db/schema/evals/eval-runs";
import { evalVariant } from "@sphynx/db/schema/evals/eval-variants";
import type {
  CaseCache,
  EvalPrepare,
  EvalSource,
  EvalValidator,
} from "@sphynx/schema/domain/eval-definition";
import type { EvalUser } from "@sphynx/schema/domain/eval-turns";
import { and, eq } from "drizzle-orm";
import { Effect, Option } from "effect";
import type { RequestedProfile } from "../domain/harness-profile";
import type { HarnessName, SandboxName } from "../domain/variant";
import { namesOf } from "../domain/variant";
import { tryStore } from "./query";

interface CasePlan {
  readonly cache: CaseCache | null;
  readonly id: string;
  readonly maxTurns: number | null;
  readonly name: string;
  readonly prepare: EvalPrepare | null;
  readonly prompt: string;
  readonly source: EvalSource;
  readonly timeoutMs: number | null;
  readonly user: EvalUser | null;
  readonly validator: EvalValidator | null;
  readonly verify: string | null;
}

export interface RunPlan {
  readonly case: CasePlan;
  readonly harness: HarnessName;
  readonly harnessCredentialRef: string | null;
  readonly harnessVersion: string;
  readonly internalId: string;
  readonly model: string;
  readonly profile: RequestedProfile | null;
  readonly sandbox: SandboxName;
  readonly sandboxCredentialRef: string | null;
  readonly trialCount: number;
}

export interface BatchPlan {
  readonly internalId: string;
  readonly local: boolean;
  readonly organizationId: string;
  readonly runs: readonly RunPlan[];
  readonly startedBy: string | null;
}

export const batchPlanQuery = Effect.gen(function* () {
  const db = yield* Database;

  return (batchInternalId: string, runInternalId?: string) =>
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
          .where(
            and(
              eq(evalBatch.internalId, batchInternalId),
              runInternalId === undefined
                ? undefined
                : eq(evalRun.internalId, runInternalId)
            )
          )
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
                maxTurns: row.version.maxTurns,
                name: row.caseName,
                prepare: row.version.prepare,
                prompt: row.version.prompt,
                source: row.version.source,
                timeoutMs: row.version.timeoutMs,
                user: row.version.user,
                validator: row.version.validator,
                verify: row.version.verify,
              },
              harness: names.harness,
              harnessCredentialRef: row.run.harnessCredentialRef,
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
                      variables: row.profile.variables,
                    },
              sandbox: names.sandbox,
              sandboxCredentialRef: row.run.sandboxCredentialRef,
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
        startedBy: first.batch.startedBy,
      });
    }).pipe(
      Effect.withSpan("BatchPlanQuery.find", {
        attributes: { batchId: batchInternalId },
      })
    );
});
