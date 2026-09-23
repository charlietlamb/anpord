import { Database } from "@anpord/db/client";
import { evalCase } from "@anpord/db/schema/evals/eval-cases";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTask } from "@anpord/db/schema/evals/eval-tasks";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { and, eq, type SQL } from "drizzle-orm";
import { Effect, type Option } from "effect";
import { head, tryStore } from "./query";

export interface TrialAddress {
  readonly caseId: string;
  readonly cellKey: string;
  readonly ordinal: number;
  readonly runId: string;
  readonly trialId: string;
}

export interface RunAddressInput {
  readonly cellKey?: string | undefined;
  readonly ordinal?: number | undefined;
  readonly organizationId: string;
  readonly runId: string;
}

const ADDRESS = {
  caseId: evalCase.id,
  cellKey: evalCell.cellKey,
  ordinal: evalTrial.ordinal,
  runId: evalRun.id,
  trialId: evalTrial.internalId,
};

export const trialAddressQuery = Effect.gen(function* () {
  const db = yield* Database;

  const addressesWhere = (condition: SQL | undefined) =>
    tryStore("runQuery.trialAddress", () =>
      db
        .select(ADDRESS)
        .from(evalTrial)
        .innerJoin(evalCell, eq(evalCell.internalId, evalTrial.cellInternalId))
        .innerJoin(evalRun, eq(evalRun.internalId, evalCell.runInternalId))
        .innerJoin(evalTask, eq(evalTask.internalId, evalCell.taskInternalId))
        .innerJoin(evalCase, eq(evalCase.internalId, evalTask.caseInternalId))
        .where(condition)
    );

  const findTrial = (input: {
    readonly organizationId: string;
    readonly trialId: string;
  }) =>
    addressesWhere(
      and(
        eq(evalTrial.internalId, input.trialId),
        eq(evalRun.organizationId, input.organizationId)
      )
    ).pipe(
      Effect.map((rows): Option.Option<TrialAddress> => head(rows)),
      Effect.withSpan("RunQuery.findTrial")
    );

  const findRunAddresses = (input: RunAddressInput) =>
    addressesWhere(
      and(
        eq(evalRun.id, input.runId),
        eq(evalRun.organizationId, input.organizationId),
        input.cellKey === undefined
          ? undefined
          : eq(evalCell.cellKey, input.cellKey),
        input.ordinal === undefined
          ? undefined
          : eq(evalTrial.ordinal, input.ordinal)
      )
    ).pipe(
      Effect.map((rows): readonly TrialAddress[] => rows),
      Effect.withSpan("RunQuery.findRunAddresses")
    );

  return { findRunAddresses, findTrial };
});
