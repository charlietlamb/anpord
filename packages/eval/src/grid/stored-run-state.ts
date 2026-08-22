import { Option } from "effect";
import type { HarnessName, ProviderName } from "../domain/cell";
import type { HarnessEvent, HarnessUsage } from "../domain/harness-event";
import { failedCommandsIn, filesIn, sessionIdOf } from "../domain/journal";
import type { RunDetail } from "../repositories/run-query";
import type { AgentTrialResult } from "../services/agent-trial";
import type { GridCell, GridRunState, GridTask } from "./state";

/** A persisted trial, seen through the shape a live one has.
 *
 * The journal is not carried: a run is read to be listed and compared, and
 * loading every event of every trial to answer that would read the largest
 * table in the system to render a row of numbers. The trial screen fetches
 * its own. */
const asResult = (input: {
  readonly commandCount: number;
  readonly events: readonly HarnessEvent[];
  readonly exitCode: number;
  readonly modelMs: number;
  readonly passed: boolean;
  readonly sandboxId: string | null;
  readonly sandboxMs: number;
  readonly status: string;
  readonly usage: HarnessUsage | null;
  readonly voidFields: readonly string[];
}): AgentTrialResult => ({
  commands: input.commandCount,
  events: input.events,
  failedCommands: failedCommandsIn(input.events),
  filesChanged: filesIn(input.events),
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
  sessionId: sessionIdOf(input.events),
  /* Recorded on the trial and, until this was written, dropped on the way
     back out: the column held a number and every stored trial reported
     none. */
  usage: Option.fromNullable(input.usage),
});

/* The column is a loose record, so the three fields are read rather than
   asserted: a row written by an older build may carry none of them, and a
   partial object presented as usage would report a token count of NaN. */
const usageOf = (value: Record<string, number> | null): HarnessUsage | null => {
  if (value === null) {
    return null;
  }

  const { inputTokens, outputTokens, totalTokens } = value;

  return typeof inputTokens === "number" &&
    typeof outputTokens === "number" &&
    typeof totalTokens === "number"
    ? { inputTokens, outputTokens, totalTokens }
    : null;
};

const statusOf = (value: string): GridRunState["status"] => {
  if (value === "finished" || value === "failed") {
    return value;
  }

  return "running";
};

/** A stored run in the shape the live view uses. */
export const runToState = (
  detail: RunDetail,
  /* Empty for the list, which needs numbers rather than journals. The trial
     screen passes the events for the one trial it is showing. */
  eventsByTrial: ReadonlyMap<string, readonly HarnessEvent[]> = new Map()
): GridRunState => {
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
      setup: Option.some({
        prompt: entry.prompt,
        repoRef: entry.repoRef,
        repoUrl: entry.repoUrl,
        setupCommand: entry.setupCommand,
        verifyCommand: entry.verifyCommand,
        workspace: entry.workspace,
      }),
      status: statusOf(entry.cell.status),
      taskIndex: taskKeys.indexOf(taskKey),
      trials: entry.trials.map((trial) =>
        Option.some(
          asResult({
            commandCount: trial.commandCount ?? 0,
            events: eventsByTrial.get(trial.internalId) ?? [],
            exitCode: trial.exitCode ?? -1,
            modelMs: trial.modelMs ?? 0,
            passed: trial.passed ?? false,
            sandboxId: trial.sandboxId,
            sandboxMs: trial.sandboxMs ?? 0,
            status: trial.status,
            usage: usageOf(trial.usage),
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
