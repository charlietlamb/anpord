import { Option } from "effect";
import type { HarnessName, ProviderName } from "../domain/cell";
import type { RunDetail } from "../repositories/run-query";
import type { AgentTrialResult } from "../services/agent-trial";
import type { GridCell, GridRunState, GridTask } from "./state";

/** A persisted trial, seen through the shape a live one has.
 *
 * The journal is not rebuilt here. A stored run is read to compare it, and
 * hydrating every event of every trial to answer a list request would read
 * the largest table in the system to render a summary. */
const asResult = (input: {
  readonly commandCount: number;
  readonly exitCode: number;
  readonly modelMs: number;
  readonly passed: boolean;
  readonly sandboxId: string | null;
  readonly sandboxMs: number;
  readonly status: string;
  readonly voidFields: readonly string[];
}): AgentTrialResult => ({
  commands: input.commandCount,
  events: [],
  failedCommands: 0,
  filesChanged: [],
  outcome: {
    commandCount: input.commandCount,
    exitCode: input.exitCode,
    modelMs: input.modelMs,
    passed: input.passed,
    sandboxMs: input.sandboxMs,
    status: input.status as AgentTrialResult["outcome"]["status"],
    voidFields: [...input.voidFields],
  },
  sandboxId: input.sandboxId ?? "",
  sessionId: null,
  usage: Option.none(),
});

const statusOf = (value: string): GridRunState["status"] => {
  if (value === "finished" || value === "failed") {
    return value;
  }

  return "running";
};

/**
 * A stored run in the shape the live view uses.
 *
 * One shape for both, so a caller never has to ask whether a run is still in
 * flight. Cases and tasks are recovered from the cells, since the grid is
 * their product and the axes are what the cells were built from.
 */
export const runToState = (detail: RunDetail): GridRunState => {
  const caseNames: string[] = [];
  const taskKeys: string[] = [];
  const tasks: GridTask[] = [];

  for (const entry of detail.cells) {
    const taskKey = [
      entry.cell.harness,
      entry.cell.harnessVersion,
      entry.cell.model,
      entry.cell.provider,
    ].join(" ");

    if (!taskKeys.includes(taskKey)) {
      taskKeys.push(taskKey);
      tasks.push({
        harness: entry.cell.harness as HarnessName,
        harnessVersion: entry.cell.harnessVersion,
        model: entry.cell.model,
        provider: entry.cell.provider as ProviderName,
      });
    }
  }

  const cells = detail.cells.map((entry): GridCell => {
    const taskKey = [
      entry.cell.harness,
      entry.cell.harnessVersion,
      entry.cell.model,
      entry.cell.provider,
    ].join(" ");

    const caseName = entry.caseName;

    if (!caseNames.includes(caseName)) {
      caseNames.push(caseName);
    }

    return {
      caseName,
      cellKey: entry.cell.cellKey,
      distribution: Option.some(entry.distribution),
      internalId: entry.cell.internalId,
      status: statusOf(entry.cell.status),
      taskIndex: taskKeys.indexOf(taskKey),
      trials: entry.trials.map((trial) =>
        Option.some(
          asResult({
            commandCount: trial.commandCount ?? 0,
            exitCode: trial.exitCode ?? -1,
            modelMs: trial.modelMs ?? 0,
            passed: trial.passed ?? false,
            sandboxId: trial.sandboxId,
            sandboxMs: trial.sandboxMs ?? 0,
            status: trial.status,
            voidFields: trial.voidFields ?? [],
          })
        )
      ),
    };
  });

  return {
    cases: caseNames,
    cells,
    failure: Option.none(),
    finishedAt: Option.fromNullable(detail.run.finishedAt).pipe(
      Option.map((date) => date.getTime())
    ),
    id: detail.run.id,
    organizationId: detail.run.organizationId,
    startedAt: detail.run.createdAt.getTime(),
    status: statusOf(detail.run.status),
    tasks,
  };
};
