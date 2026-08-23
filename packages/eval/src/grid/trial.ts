import { Clock, Effect, Option, Redacted, Ref } from "effect";
import type { HarnessEvent } from "../domain/harness-event";
import { renderPrompt } from "../domain/prompt";
import type { TrialRecorderShape } from "../repositories/trial-record";
import type {
  AgentTrialResult,
  AgentTrialShape,
} from "../services/agent-trial";
import type { GridCase } from "./cell";
import type { GridExecutionTask } from "./state";

export interface TrialInputs {
  readonly agent: AgentTrialShape;
  readonly onProgress: (
    ordinal: number,
    journal: readonly HarnessEvent[]
  ) => Effect.Effect<void>;
  readonly onTrial: (
    ordinal: number,
    result: AgentTrialResult
  ) => Effect.Effect<void>;
  readonly prompt: string;
  readonly recorder: TrialRecorderShape;
  readonly subject: GridCase;
  readonly task: GridExecutionTask;
}

export const WORKSPACE = "/tmp/anpord-task";
const AUTO_STOP_MINUTES = 15;

interface RunOneTrial extends TrialInputs {
  readonly cellInternalId: string;
  readonly ordinal: number;
}

export const runTrial = (input: RunOneTrial) =>
  Effect.gen(function* () {
    const startedAt = yield* Clock.currentTimeMillis;
    const seen = yield* Ref.make<readonly HarnessEvent[]>([]);

    const trialInternalId = yield* input.recorder.open({
      cellInternalId: input.cellInternalId,
      ordinal: input.ordinal,
      provider: input.task.provider,
      startedAt: new Date(startedAt),
    });

    yield* Effect.addFinalizer((exit) =>
      exit._tag === "Success"
        ? Effect.void
        : Clock.currentTimeMillis.pipe(
            Effect.flatMap((finishedAt) =>
              input.recorder.abandon({
                finishedAt: new Date(finishedAt),
                trialInternalId,
              })
            ),
            Effect.ignore
          )
    );

    const result = yield* input.agent.run({
      autoStopMinutes: AUTO_STOP_MINUTES,
      harnessCredential: input.task.credentials.harness,
      harness: input.task.harness,
      harnessVersion: input.task.harnessVersion,
      model: input.task.model,
      progress: {
        append: (events, from) =>
          Effect.gen(function* () {
            const journal = yield* Ref.updateAndGet(seen, (all) => [
              ...all,
              ...events,
            ]);

            yield* input.recorder.append({ events, from, trialInternalId });
            yield* input.onProgress(input.ordinal, journal);
          }),
      },
      prompt: renderPrompt(input.prompt, { goal: input.subject.goal }),
      provider: input.task.provider,
      sandboxCredentials:
        input.task.credentials.sandbox === undefined
          ? undefined
          : Redacted.make(
              Redacted.value(input.task.credentials.sandbox).values
            ),
      setupCommand: input.subject.setup,
      source: input.subject.source,
      verifyCommand: input.subject.verify,
      workspace: WORKSPACE,
    });

    const finishedAt = yield* Clock.currentTimeMillis;

    yield* input.recorder.settle({
      finishedAt: new Date(finishedAt),
      outcome: result.outcome,
      sandboxId: result.sandboxId,
      trialInternalId,
      usage: Option.getOrNull(result.usage),
    });

    yield* input.onTrial(input.ordinal, result);

    return result;
  }).pipe(
    Effect.scoped,
    Effect.withSpan("GridCell.trial", {
      attributes: { ordinal: input.ordinal },
    })
  );
