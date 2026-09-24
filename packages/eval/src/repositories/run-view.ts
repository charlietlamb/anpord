import type { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import type { evalCaseVersion } from "@anpord/db/schema/evals/eval-case-versions";
import type { evalHarnessProfile } from "@anpord/db/schema/evals/eval-harness-profiles";
import type { evalRun } from "@anpord/db/schema/evals/eval-runs";
import type { evalTrialCost } from "@anpord/db/schema/evals/eval-trial-costs";
import type { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import type { evalVariant } from "@anpord/db/schema/evals/eval-variants";
import type {
  EvalRun,
  EvalSetup,
  EvalTrial,
  EvalVariant,
} from "@anpord/schema/domain/evals";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import { decodeTrialStatus } from "@anpord/schema/domain/trial";
import { DateTime, Option } from "effect";
import { distributionOf } from "../domain/distribution";
import { costsOf, rollUp } from "../domain/eval-costs";
import { usageOf } from "../domain/harness-event";
import { commandsIn, failedCommandsIn, filesIn } from "../domain/journal";
import { asEntries } from "../domain/journal-entries";
import { namesOf } from "../domain/variant";

export interface RunRow {
  readonly batch: typeof evalBatch.$inferSelect;
  readonly case: { readonly id: string; readonly name: string };
  readonly profile: typeof evalHarnessProfile.$inferSelect | null;
  readonly run: typeof evalRun.$inferSelect;
  readonly suite: { readonly id: string; readonly name: string };
  readonly variant: typeof evalVariant.$inferSelect;
  readonly version: typeof evalCaseVersion.$inferSelect;
}

type TrialRow = typeof evalTrial.$inferSelect;
type CostRow = typeof evalTrialCost.$inferSelect;

const timestamp = (date: Date) => DateTime.unsafeMake(date.getTime());

export const variantOf = (
  row: typeof evalVariant.$inferSelect
): Option.Option<EvalVariant> =>
  Option.map(namesOf(row), (names) => ({
    harness: names.harness,
    id: row.internalId,
    model: row.model,
    profile: row.profile,
    sandbox: names.sandbox,
    userModel: row.userModel,
  }));

export const setupOf = (
  version: typeof evalCaseVersion.$inferSelect
): EvalSetup => ({
  prepare: version.prepare?.name ?? null,
  prompt: version.prompt,
  source: version.source,
  validator: version.validator?.name ?? null,
  validatorFiles: version.validator?.sourceFiles,
  verify: version.verify,
});

export const trialOf = (
  row: TrialRow,
  costs: readonly CostRow[],
  events: readonly HarnessEvent[] | undefined
): EvalTrial => ({
  artifacts: row.artifacts ?? [],
  commands: row.commandCount ?? (events === undefined ? 0 : commandsIn(events)),
  costs: costsOf(costs),
  exitCode: row.exitCode ?? -1,
  failedCommands: events === undefined ? 0 : failedCommandsIn(events),
  filesChanged: events === undefined ? [] : filesIn(events),
  id: row.internalId,
  modelMs: row.modelMs ?? 0,
  ordinal: row.ordinal,
  sandboxId: row.sandboxId,
  sandboxMs: row.sandboxMs ?? 0,
  status: Option.getOrElse(decodeTrialStatus(row.status), () => "void" as const),
  timed:
    events !== undefined && new Set(events.map((event) => event.at)).size > 1,
  trajectory: events === undefined ? [] : events.flatMap(asEntries),
  usage: usageOf(row.usage),
  validations: row.validations ?? [],
  verifySteps: row.verifySteps ?? [],
  voidFields: row.voidFields ?? [],
});

export const runStatus = (value: string): EvalRun["status"] => {
  if (value === "finished" || value === "failed") {
    return value;
  }
  return "running";
};

export const runOf = (
  row: RunRow,
  trials: readonly EvalTrial[]
): Option.Option<EvalRun> =>
  Option.map(variantOf(row.variant), (variant) => ({
    batchId: row.batch.internalId,
    case: row.case,
    costs: rollUp(trials.map((trial) => trial.costs)),
    definitionHash: row.version.definitionHash,
    distribution: distributionOf(trials),
    finishedAt: row.run.finishedAt === null ? null : timestamp(row.run.finishedAt),
    harnessVersion: row.run.harnessVersion,
    id: row.run.internalId,
    local: row.batch.local,
    profileVersion: row.profile?.version ?? null,
    setup: setupOf(row.version),
    startedAt: timestamp(row.run.createdAt),
    status: runStatus(row.run.status),
    suite: row.suite,
    trials: trials.toSorted((left, right) => left.ordinal - right.ordinal),
    trigger: row.batch.trigger,
    variant,
  }));
