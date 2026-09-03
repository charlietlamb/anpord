import { Option } from "effect";
import type { HarnessName, ProviderName } from "../domain/cell";
import type { HarnessEvent, HarnessUsage } from "../domain/harness-event";
import { usageOf } from "../domain/harness-event";
import { failedCommandsIn, filesIn, sessionIdOf } from "../domain/journal";
import type { VerifyStepResult } from "../domain/trial";
import type { RunDetail } from "../repositories/run-detail";
import type { AgentTrialResult } from "../services/agent-trial";
import type { GridCell, GridRunState, GridTask } from "./state";

const asResult = (input: {
  readonly commandCount: number;
  readonly events: readonly HarnessEvent[];
  readonly exitCode: number;
  readonly modelMs: number;
  readonly passed: boolean;
  readonly sandboxId: string | null;
  readonly prepared: Readonly<Record<string, unknown>> | null;
  readonly sandboxMs: number;
  readonly status: string;
  readonly usage: HarnessUsage | null;
  readonly verifySteps: readonly VerifyStepResult[];
  readonly voidFields: readonly string[];
}): AgentTrialResult => ({
  commands: input.commandCount,
  events: input.events,
  failedCommands: failedCommandsIn(input.events),
  filesChanged: filesIn(input.events),
  prepared: input.prepared ?? {},
  outcome: {
    commandCount: input.commandCount,
    exitCode: input.exitCode,
    modelMs: input.modelMs,
    passed: input.passed,
    sandboxMs: input.sandboxMs,
    status: input.status as AgentTrialResult["outcome"]["status"],
    verifySteps: [...input.verifySteps],
    voidFields: [...input.voidFields],
  },
  sandboxId: input.sandboxId ?? "",
  sessionId: sessionIdOf(input.events),

  usage: Option.fromNullable(input.usage),
});

const statusOf = (value: string): GridRunState["status"] => {
  if (value === "finished" || value === "failed") {
    return value;
  }

  return "running";
};

export const runToState = (
  detail: RunDetail,

  eventsByTrial: ReadonlyMap<string, readonly HarnessEvent[]> = new Map()
): GridRunState => {
  const caseNames: string[] = [];
  const taskKeys: string[] = [];
  const tasks: GridTask[] = [];

  for (const entry of detail.cells) {
    const taskKey = [
      entry.cell.harness,
      entry.cell.model,
      entry.cell.provider,
      entry.profile?.name ?? "",
    ].join(" ");

    if (!taskKeys.includes(taskKey)) {
      taskKeys.push(taskKey);
      tasks.push({
        harness: entry.cell.harness as HarnessName,
        harnessVersion: entry.cell.harnessVersion,
        model: entry.cell.model,
        profile:
          entry.profile === null
            ? null
            : {
                internalId: entry.profile.internalId,
                name: entry.profile.name,
                version: entry.profile.version,
              },
        provider: entry.cell.provider as ProviderName,
      });
    }
  }

  const cells = detail.cells.map((entry): GridCell => {
    const taskKey = [
      entry.cell.harness,
      entry.cell.model,
      entry.cell.provider,
      entry.profile?.name ?? "",
    ].join(" ");

    const caseName = entry.caseName;

    if (!caseNames.includes(caseName)) {
      caseNames.push(caseName);
    }

    return {
      caseName,
      cellKey: entry.cell.cellKey,
      live: new Map(),
      distribution: Option.some(entry.distribution),
      internalId: entry.cell.internalId,
      setup: Option.some({
        prompt: entry.prompt,
        repoRef: entry.repoRef,
        repoUrl: entry.repoUrl,
        prepareName: entry.prepareName,
        validatorName: entry.validatorName,
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
            prepared: trial.prepared ?? null,
            sandboxId: trial.sandboxId,
            sandboxMs: trial.sandboxMs ?? 0,
            status: trial.status,
            usage: usageOf(trial.usage),
            verifySteps: trial.verifySteps ?? [],
            voidFields: trial.voidFields ?? [],
          })
        )
      ),
    };
  });

  return {
    cases: caseNames,
    cells,
    failure: Option.fromNullable(detail.run.failure),
    finishedAt: Option.fromNullable(detail.run.finishedAt).pipe(
      Option.map((date) => date.getTime())
    ),
    id: detail.run.id,
    name: detail.run.name,
    organizationId: detail.run.organizationId,
    startedAt: detail.run.createdAt.getTime(),
    status: statusOf(detail.run.status),
    tasks,
  };
};
