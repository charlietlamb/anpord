import { EvalReads } from "@sphynx/eval/services/eval-reads";
import type { EvalArtifactRequest } from "@sphynx/schema/domain/eval-trial";
import { Effect } from "effect";
import { withEvalErrors } from "../../http/eval-errors";
import { organization } from "./current-organization";

export const listCaseRuns = (
  caseId: string,
  page: number | undefined,
  variant: string | undefined
) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).caseRuns({
      caseId,
      organizationId: yield* organization,
      page: page ?? 1,
      variant: variant ?? null,
    });
  });

export const readRun = (runId: string) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).run(yield* organization, runId);
  }).pipe(withEvalErrors);

export const readTrialAddress = (trialId: string) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).trialAddress(yield* organization, trialId);
  }).pipe(withEvalErrors);

export const readArtifact = (input: EvalArtifactRequest) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).artifact(yield* organization, input);
  }).pipe(withEvalErrors);
