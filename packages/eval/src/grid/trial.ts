import { Clock, Effect, Option, Redacted, Ref } from "effect";
import type { HarnessEvent, HarnessUsage } from "../domain/harness-event";
import { costOf } from "../domain/model-price";
import { renderPrompt } from "../domain/prompt";
import { ModelPrices } from "../ports/model-source";
import type { TrialRecorderShape } from "../repositories/trial-record";
import type {
  AgentTrialResult,
  AgentTrialShape,
} from "../services/agent-trial";
import type { GridCase } from "./cell";
import type { GridExecutionTask } from "./state";

/**
 * The usage a trial reported, with what it cost at the time it ran.
 *
 * Priced here rather than when the trial is read, because a published rate
 * changes and a finished run does not: recomputing later would silently
 * restate what a past run cost, and two readings of the same trial would
 * disagree. An unpriced model records its tokens and no cost, which reads as
 * unknown rather than as free.
 *
 * A catalogue that cannot be reached costs the trial nothing: the run has
 * already happened, and losing the tokens it reported over a missing price
 * would be the more expensive failure.
 */
const priced = (
  usage: Option.Option<HarnessUsage>,
  model: string
): Effect.Effect<HarnessUsage | null, never, ModelPrices> =>
  Effect.gen(function* () {
    const reported = Option.getOrNull(usage);

    if (reported === null) {
      return null;
    }

    const price = yield* ModelPrices.pipe(
      Effect.flatMap((prices) => prices.forModel(model)),
      Effect.catchAll(() => Effect.succeed(Option.none()))
    );

    return Option.match(price, {
      onNone: () => reported,
      onSome: (found) => ({ ...reported, costUsd: costOf(reported, found) }),
    });
  }).pipe(Effect.orElseSucceed(() => Option.getOrNull(usage)));

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
  readonly organizationId: string;
  readonly prompt: string;
  readonly recorder: TrialRecorderShape;
  readonly sourceToken?: Redacted.Redacted<string> | undefined;
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
      onSandbox: (sandboxId) =>
        Effect.ignoreLogged(
          input.recorder.attach({ sandboxId, trialInternalId })
        ),
      harnessCredential: input.task.credentials.harness,
      harness: input.task.harness,
      harnessVersion: input.task.harnessVersion,
      model: input.task.model,
      organizationId: input.organizationId,
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
      prompt: renderPrompt(input.prompt, input.subject.variables),
      provider: input.task.provider,
      sandboxCredentials:
        input.task.credentials.sandbox === undefined
          ? undefined
          : Redacted.make(
              Redacted.value(input.task.credentials.sandbox).values
            ),
      prepare: input.subject.prepare,
      sourceToken: input.sourceToken,
      source: input.subject.source,
      validator: input.subject.validator,
      verifyCommand: input.subject.verify,
      workspace: WORKSPACE,
    });

    const finishedAt = yield* Clock.currentTimeMillis;

    yield* input.recorder.settle({
      finishedAt: new Date(finishedAt),
      outcome: result.outcome,
      prepared: result.prepared,
      sandboxId: result.sandboxId,
      trialInternalId,
      usage: yield* priced(result.usage, input.task.model),
    });

    yield* input.onTrial(input.ordinal, result);

    return result;
  }).pipe(
    Effect.scoped,
    Effect.withSpan("GridCell.trial", {
      attributes: { ordinal: input.ordinal },
    })
  );
