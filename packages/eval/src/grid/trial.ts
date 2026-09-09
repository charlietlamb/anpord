import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import { Clock, Effect, Option, Redacted, Ref } from "effect";
import { failureOf } from "../domain/failure";
import type { HarnessEvent, HarnessUsage } from "../domain/harness-event";
import { costOf, type ModelPrice } from "../domain/model-price";
import { renderPrompt } from "../domain/prompt";
import { breakdownOf } from "../domain/trial-cost";
import { validationPlan } from "../domain/validation-plan";
import { ModelPrices } from "../ports/model-source";
import type { TrialCostRepositoryShape } from "../repositories/trial-cost-repository";
import type { TrialRecorderShape } from "../repositories/trial-record";
import type {
  AgentTrialResult,
  AgentTrialShape,
} from "../services/agent-trial";
import type { GridCase } from "./cell";

import type { GridExecutionTask } from "./state";

/* Priced at run time, not read time: a published rate changes and a finished run
   must not. An unreachable catalogue costs the trial nothing. */
const rateFor = (model: string) =>
  ModelPrices.pipe(
    Effect.flatMap((prices) => prices.forModel(model)),
    Effect.catchAll(() => Effect.succeed(Option.none<ModelPrice>()))
  );

const priced = (
  usage: Option.Option<HarnessUsage>,
  model: string
): Effect.Effect<HarnessUsage | null, never, ModelPrices> =>
  Effect.gen(function* () {
    const reported = Option.getOrNull(usage);

    if (reported === null) {
      return null;
    }

    const price = yield* rateFor(model);

    return Option.match(price, {
      onNone: () => reported,
      onSome: (found) => ({ ...reported, costUsd: costOf(reported, found) }),
    });
  }).pipe(Effect.orElseSucceed(() => Option.getOrNull(usage)));

export interface TrialInputs {
  readonly agent: AgentTrialShape;
  readonly costs: TrialCostRepositoryShape;
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

    const { priorSandboxId, trialInternalId } = yield* input.recorder.open({
      cellInternalId: input.cellInternalId,
      ordinal: input.ordinal,
      provider: input.task.provider,
      startedAt: new Date(startedAt),
    });
    const validations = yield* Ref.make<readonly EvalValidation[]>(
      validationPlan(input.subject.validator, input.subject.verify)
    );
    const recordValidations = (records: readonly EvalValidation[]) =>
      input.recorder.recordValidations({
        trialInternalId,
        validations: records,
      });

    /* The cause goes into the row: the sandbox holding it is deleted on the way out. */
    yield* Effect.addFinalizer((exit) =>
      exit._tag === "Success"
        ? Effect.void
        : Clock.currentTimeMillis.pipe(
            Effect.flatMap((finishedAt) =>
              input.recorder.abandon({
                failure: failureOf(exit.cause),
                finishedAt: new Date(finishedAt),
                trialInternalId,
              })
            ),
            Effect.ignore
          )
    );

    yield* recordValidations(yield* Ref.get(validations));
    const result = yield* input.agent.run({
      onValidation: (record) =>
        Effect.gen(function* () {
          const records = yield* Ref.get(validations);
          const previous = records.find((entry) => entry.id === record.id);
          const next = previous
            ? records.map((entry) => (entry.id === record.id ? record : entry))
            : [...records, record];
          yield* Ref.set(validations, next);
          yield* recordValidations(next);
          if (previous?.status !== record.status) {
            yield* Effect.logInfo("validation status changed").pipe(
              Effect.annotateLogs({
                validationId: record.id,
                validator: record.name,
                kind: record.kind,
                status: record.status,
                durationMs: record.durationMs,
              })
            );
          }
        }).pipe(
          Effect.orDie,
          Effect.annotateLogs({
            trialInternalId,
            cellInternalId: input.cellInternalId,
            ordinal: input.ordinal,
          })
        ),
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
      priorSandboxId: Option.getOrUndefined(priorSandboxId),
      profile: input.task.profile,
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
      caseCache: input.subject.cache,
      prepare: input.subject.prepare,
      sourceToken: input.sourceToken,
      source: input.subject.source,
      validator: input.subject.validator,
      verifyCommand: input.subject.verify,
      workspace: WORKSPACE,
    });

    const finishedAt = yield* Clock.currentTimeMillis;

    const usage = yield* priced(result.usage, input.task.model);

    yield* input.recorder.settle({
      artifacts: result.artifactContents,
      finishedAt: new Date(finishedAt),
      outcome: result.outcome,
      prepared: result.prepared,
      sandboxId: result.sandboxId,
      trialInternalId,
      usage,
    });

    /* Stored, not derived on read: the rate is a fact about when the trial ran. */
    yield* input.costs
      .record({
        components: breakdownOf({
          authMethodId: Redacted.value(input.task.credentials.harness)
            .authMethodId,
          harness: input.task.harness,
          hasOwnSandboxCredential:
            input.task.bindings?.sandboxConnectionId !== undefined,
          model: input.task.model,
          modelMs: result.outcome.modelMs ?? 0,
          price: yield* rateFor(input.task.model),
          provider: input.task.provider,
          sandboxMs: result.outcome.sandboxMs ?? 0,
          usage,
          judgments: result.outcome.judgments,
        }),
        trialInternalId,
      })
      .pipe(Effect.ignoreLogged);

    const { artifactContents: _artifactContents, ...stored } = result;
    yield* input.onTrial(input.ordinal, stored);

    return stored;
  }).pipe(
    Effect.scoped,
    Effect.withSpan("GridCell.trial", {
      attributes: {
        ordinal: input.ordinal,
        cellInternalId: input.cellInternalId,
        organizationId: input.organizationId,
      },
    })
  );
