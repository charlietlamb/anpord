import { costsOf } from "@anpord/eval/domain/eval-costs";
import { usageOf } from "@anpord/eval/domain/harness-event";
import type { CellHistoryEntry } from "@anpord/eval/repositories/cell-history-query";
import { EvalJudgment } from "@anpord/schema/domain/eval-judges";
import type {
  EvalCellHistoryEntry,
  EvalTrial,
} from "@anpord/schema/domain/evals";
import { DateTime, Schema } from "effect";

/* No trajectory: the journal is fetched per trial, so a history of twenty readings would pull twenty journals to draw a table showing none. */
const asStoredTrial = (trial: {
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
  readonly modelMs: number | null;
  readonly ordinal: number;
  readonly passed: boolean | null;
  readonly sandboxId: string | null;
  readonly sandboxMs: number | null;
  readonly status: string;
  readonly usage: Record<string, number> | null;
  readonly prepared: Record<string, unknown> | null;
  readonly verifySteps: { command: string; exitCode: number }[] | null;
  readonly voidFields: string[] | null;
}): EvalTrial => ({
  commands: trial.commandCount ?? 0,
  judgments: Schema.decodeUnknownSync(Schema.Array(EvalJudgment))(
    trial.judgments ?? []
  ),
  costs: costsOf(trial.costs ?? []),
  prepared: trial.prepared,
  exitCode: trial.exitCode ?? -1,
  failedCommands: 0,
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
  verifySteps: trial.verifySteps ?? [],
  voidFields: trial.voidFields ?? [],
});

/* The cell key hashes case, setup, harness, model, provider and profile, so only trials and versions differ across readings. */
export const asReading = (entry: CellHistoryEntry): EvalCellHistoryEntry => ({
  distribution: entry.distribution,
  finishedAt:
    entry.finishedAt === null
      ? null
      : DateTime.unsafeMake(entry.finishedAt.getTime()),
  harnessVersion: entry.harnessVersion,
  internalId: entry.internalId,
  profileVersion: entry.profileVersion,
  runId: entry.runId,
  trigger: entry.trigger,
  trials: entry.trials.map(asStoredTrial),
});
