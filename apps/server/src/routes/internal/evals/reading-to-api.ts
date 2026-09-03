import { usageOf } from "@anpord/eval/domain/harness-event";
import { costsOf } from "@anpord/eval/domain/eval-costs";
import type { CellHistoryEntry } from "@anpord/eval/repositories/cell-history-query";
import type {
  EvalCellHistoryEntry,
  EvalTrial,
} from "@anpord/schema/domain/evals";
import { DateTime } from "effect";

/**
 * A stored trial row as the wire sees it.
 *
 * No trajectory: the journal is fetched per trial, and a history of twenty
 * readings would pull twenty journals to draw a table that shows none of them.
 * The trial's own page is where a trajectory is read.
 */
const asStoredTrial = (trial: {
  readonly commandCount: number | null;
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

/**
 * One past reading of a cell, with the trials it was computed from.
 *
 * Every reading holds the same case, setup, harness, model and provider,
 * because the cell key hashes them. Only the trials and the harness version
 * differ, which is why they travel together rather than a page apart.
 */
export const asReading = (entry: CellHistoryEntry): EvalCellHistoryEntry => ({
  distribution: entry.distribution,
  finishedAt:
    entry.finishedAt === null
      ? null
      : DateTime.unsafeMake(entry.finishedAt.getTime()),
  harnessVersion: entry.harnessVersion,
  internalId: entry.internalId,
  runId: entry.runId,
  trials: entry.trials.map(asStoredTrial),
});
