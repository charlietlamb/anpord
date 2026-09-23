import { costsOf } from "@anpord/eval/domain/eval-costs";
import { usageOf } from "@anpord/eval/domain/harness-event";
import type { CellHistoryEntry } from "@anpord/eval/repositories/cell-history-query";
import { EvalJudgment } from "@anpord/schema/domain/eval-judges";
import { EvalValidations } from "@anpord/schema/domain/eval-validations";
import type {
  EvalCellHistoryEntry,
  EvalTrial,
} from "@anpord/schema/domain/evals";
import { DateTime, Option, Schema } from "effect";

const decodeValidations = Schema.decodeUnknownOption(EvalValidations);

/* No trajectory: the journal is fetched per trial, so a history of twenty readings would pull twenty journals to draw a table showing none. */
const toStoredTrial = (trial: {
  readonly artifacts?: EvalTrial["artifacts"] | null;
  readonly commandCount: number | null;
  readonly judgments?: unknown;
  readonly costs?: readonly {
    readonly amountNanos: bigint | null;
    readonly classification: string;
    readonly component: string;
    readonly detail: Record<string, unknown>;
    readonly explanation: string;
    readonly source: string;
  }[];
  readonly exitCode: number | null;
  readonly internalId: string;
  readonly modelMs: number | null;
  readonly ordinal: number;
  readonly passed: boolean | null;
  readonly sandboxId: string | null;
  readonly sandboxMs: number | null;
  readonly status: string;
  readonly usage: Record<string, number> | null;
  readonly prepared: Record<string, unknown> | null;
  readonly validations?: unknown;
  readonly verifySteps: { command: string; exitCode: number }[] | null;
  readonly voidFields: string[] | null;
}): EvalTrial => ({
  artifacts: trial.artifacts?.map(({ path, byteSize, sha256 }) => ({
    path,
    byteSize,
    sha256,
  })),
  commands: trial.commandCount ?? 0,
  judgments: Schema.decodeUnknownSync(Schema.Array(EvalJudgment))(
    trial.judgments ?? []
  ),
  costs: costsOf(trial.costs ?? []),
  prepared: trial.prepared,
  exitCode: trial.exitCode ?? -1,
  failedCommands: 0,
  id: trial.internalId,
  filesChanged: [],
  modelMs: trial.modelMs ?? 0,
  ordinal: trial.ordinal,
  passed: trial.passed ?? false,
  sandboxId: trial.sandboxId,
  sandboxMs: trial.sandboxMs ?? 0,
  status: trial.status as EvalTrial["status"],
  timed: false,
  trajectory: [],
  usage: usageOf(trial.usage),
  validations: Option.getOrUndefined(decodeValidations(trial.validations)),
  verifySteps: trial.verifySteps ?? [],
  voidFields: trial.voidFields ?? [],
});

/* The cell key hashes the case, harness, model, provider and profile, so readings differ by trials, versions and which definition they measured. */
export const toReadingView = (
  entry: CellHistoryEntry
): EvalCellHistoryEntry => ({
  definitionHash: entry.definitionHash,
  distribution: entry.distribution,
  finishedAt:
    entry.finishedAt === null
      ? null
      : DateTime.unsafeMake(entry.finishedAt.getTime()),
  harness: entry.harness,
  harnessVersion: entry.harnessVersion,
  internalId: entry.internalId,
  local: entry.local,
  model: entry.model,
  profileVersion: entry.profileVersion,
  runId: entry.runId,
  sandbox: entry.sandbox,
  trigger: entry.trigger,
  trials: entry.trials.map(toStoredTrial),
});
