import { EvalJudgment } from "@anpord/schema/domain/eval-judges";
import { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import { EvalValidations } from "@anpord/schema/domain/eval-validations";
import { EvalArtifactMetadata } from "@anpord/schema/domain/evals";
import { Option, Schema } from "effect";
import type { HarnessEvent, HarnessUsage } from "../domain/harness-event";
import { usageOf } from "../domain/harness-event";
import { failedCommandsIn, filesIn, sessionIdOf } from "../domain/journal";
import { namesOf } from "../domain/stored-cell";
import { trialStatusOf, type VerifyStepResult } from "../domain/trial";
import { interruptedValidation } from "../domain/validation-plan";
import type { RunDetail } from "../repositories/run-detail";
import type { AgentTrialResult } from "../services/agent-trial";
import type { GridCell, GridRunState, GridTask } from "./state";

const asResult = (input: {
  readonly commandCount: number;
  readonly events: readonly HarnessEvent[];
  readonly exitCode: number;
  readonly modelMs: number;
  readonly judgments?: unknown;
  readonly artifacts?: unknown;
  readonly validations?: unknown;
  readonly finishedAt: number | null;
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
    artifacts: Schema.decodeUnknownSync(Schema.Array(EvalArtifactMetadata))(
      input.artifacts ?? []
    ),
    validations:
      input.validations == null
        ? undefined
        : Schema.decodeUnknownSync(EvalValidations)(input.validations).map(
            (record) =>
              input.finishedAt === null
                ? record
                : interruptedValidation(record, input.finishedAt)
          ),
    judgments: Schema.decodeUnknownSync(Schema.Array(EvalJudgment))(
      input.judgments ?? []
    ),
    commandCount: input.commandCount,
    exitCode: input.exitCode,
    modelMs: input.modelMs,
    passed: input.passed,
    sandboxMs: input.sandboxMs,
    /* Void, not the row's own text: a status this build cannot name describes
       a trial it has no way to interpret, and void is the status for a trial
       that is not evidence about anything. */
    status: Option.getOrElse(
      trialStatusOf(input.status),
      () => "void" as const
    ),
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

    const names = namesOf(entry.cell);

    if (!taskKeys.includes(taskKey) && Option.isSome(names)) {
      taskKeys.push(taskKey);
      tasks.push({
        harness: names.value.harness,
        harnessVersion: entry.cell.harnessVersion,
        model: entry.cell.model,
        profile:
          entry.profile == null
            ? null
            : {
                internalId: entry.profile.internalId,
                name: entry.profile.name,
                version: entry.profile.version,
              },
        provider: names.value.provider,
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
        validatorFiles: entry.validatorFiles,
        verifyCommand: entry.verifyCommand,
        workspace: entry.workspace,
      }),
      status: statusOf(entry.cell.status),
      taskIndex: taskKeys.indexOf(taskKey),
      trials: entry.trials.map((trial) =>
        Option.some(
          asResult({
            artifacts: trial.artifacts,
            commandCount: trial.commandCount ?? 0,
            events: eventsByTrial.get(trial.internalId) ?? [],
            exitCode: trial.exitCode ?? -1,
            modelMs: trial.modelMs ?? 0,
            judgments: trial.judgments,
            validations: trial.validations,
            finishedAt: trial.finishedAt?.getTime() ?? null,
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
    trigger: Schema.decodeUnknownSync(Schema.NullOr(EvalTrigger))(
      detail.run.trigger
    ),
    organizationId: detail.run.organizationId,
    startedAt: detail.run.createdAt.getTime(),
    status: statusOf(detail.run.status),
    tasks,
  };
};
