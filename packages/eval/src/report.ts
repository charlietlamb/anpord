import type { Distribution } from "./domain/distribution";
import type { AgentTrialResult } from "./services/agent-trial";

const pad = (value: string, width: number) => value.padEnd(width);

const rate = (distribution: Distribution) =>
  `${distribution.passed}/${distribution.scored}`;

const spread = (values: readonly number[]) => {
  if (values.length === 0) {
    return "none";
  }

  const low = Math.min(...values);
  const high = Math.max(...values);

  return low === high ? `${low}` : `${low} to ${high}`;
};

export interface CellReport {
  readonly commandSpread: readonly number[];
  readonly distribution: Distribution;
  readonly harness: string;
  readonly harnessVersion: string;
  readonly model: string;
  readonly provider: string;
  readonly taskId: string;
  readonly trials: readonly AgentTrialResult[];
}

/**
 * What a cell looks like when a person reads it.
 *
 * The spread sits beside the rate because a rate alone reads as a grade: ten
 * of ten in nine to eleven commands and seven of ten in nine to forty-one are
 * different findings, and only the second tells you the cell is not stable.
 *
 * Voided trials are printed separately rather than folded into failures. A
 * trial that never ran is not evidence about the agent, and counting it as one
 * is the mistake this whole system exists to avoid.
 */
export const cellReport = (report: CellReport) => {
  const { distribution: found } = report;

  const header = [
    report.taskId,
    `${report.harness} ${report.harnessVersion}`,
    report.model,
    report.provider,
    `${found.trials} trials`,
  ].join(" · ");

  const lines = [
    "",
    `  ${header}`,
    "",
    `  ${pad("pass rate", 16)}${rate(found)}`,
    `  ${pad("commands", 16)}${spread(report.commandSpread)}   (p50 ${found.commandMedian})`,
    `  ${pad("voided", 16)}${found.voided}`,
    `  ${pad("deterministic", 16)}${found.deterministic ? "yes" : "no"}`,
    "",
  ];

  if (found.voided > 0) {
    lines.push(
      `  ${found.voided} trial${found.voided === 1 ? "" : "s"} produced no evidence and are not scored`,
      ""
    );
  }

  if (!found.deterministic && found.scored > 1) {
    lines.push(
      "  this cell is not deterministic: the trials did not agree, or they",
      "  disagreed about how much work the task takes",
      ""
    );
  }

  for (const [index, trial] of report.trials.entries()) {
    lines.push(
      `  trial ${index + 1}  ${pad(trial.outcome.status, 10)}` +
        `${pad(`${trial.commands} commands`, 16)}` +
        `${pad(`${trial.failedCommands} failed`, 12)}` +
        `${trial.outcome.modelMs}ms model  ${trial.outcome.sandboxMs}ms sandbox`
    );
  }

  lines.push("");

  return lines.join("\n");
};
