import { Database } from "@anpord/db/client";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { IdGenerator } from "@anpord/ids/id";
import { Context, Effect, Layer } from "effect";
import type { ProviderName } from "../domain/cell";
import type { EvalStoreError } from "../domain/errors";
import type { HarnessEvent, HarnessUsage } from "../domain/harness-event";
import { momentOf } from "../domain/harness-event";
import type { TrialOutcome } from "../domain/trial";
import { tryStore } from "./query";

export interface RecordTrial {
  readonly cellInternalId: string;
  readonly events: readonly HarnessEvent[];
  readonly finishedAt: Date;
  readonly ordinal: number;
  readonly outcome: TrialOutcome;
  readonly provider: ProviderName;
  readonly sandboxId: string | null;
  readonly startedAt: Date;
  /** Tokens the model spent. Captured by every harness adapter and, until
     this was written, thrown away: the column existed and was always null,
     so nothing could answer what a run cost. */
  readonly usage: HarnessUsage | null;
}

export interface TrialRecorderShape {
  /** Writes a finished trial and its journal indivisibly. */
  readonly record: (
    input: RecordTrial
  ) => Effect.Effect<string, EvalStoreError>;
}

export class TrialRecorder extends Context.Tag("@anpord/eval/TrialRecorder")<
  TrialRecorder,
  TrialRecorderShape
>() {}

export const TrialRecorderLive = Layer.effect(
  TrialRecorder,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    const record = (input: RecordTrial) =>
      Effect.gen(function* () {
        const trialInternalId = yield* ids.generate("evalTrial");

        const events = yield* Effect.forEach(input.events, (event, index) =>
          ids.generate("evalEvent").pipe(
            Effect.map((internalId) => ({
              internalId,
              kind: event._tag,
              /* Lifted out of the payload into columns of their own so a
                 waterfall can order and window on them without reading every
                 journal in the table. */
              occurredAt: momentOf(event.at),
              payload: event,
              seq: index,
              startedAt: momentOf(
                event._tag === "Command" ? event.startedAt : undefined
              ),
              trialInternalId,
            }))
          )
        );

        yield* tryStore("trial.record", () =>
          db.transaction(async (tx) => {
            await tx.insert(evalTrial).values({
              attempt: 1,
              cellInternalId: input.cellInternalId,
              commandCount: input.outcome.commandCount,
              exitCode: input.outcome.exitCode,
              finishedAt: input.finishedAt,
              internalId: trialInternalId,
              modelMs: input.outcome.modelMs,
              ordinal: input.ordinal,
              passed: input.outcome.passed,
              provider: input.provider,
              sandboxId: input.sandboxId,
              sandboxMs: input.outcome.sandboxMs,
              startedAt: input.startedAt,
              status: input.outcome.status,
              usage: input.usage === null ? null : { ...input.usage },
              voidFields: [...input.outcome.voidFields],
            });

            if (events.length > 0) {
              await tx.insert(evalEvent).values(events);
            }
          })
        );

        return trialInternalId;
      }).pipe(
        Effect.withSpan("TrialRecorder.record", {
          attributes: {
            events: input.events.length,
            ordinal: input.ordinal,
            status: input.outcome.status,
          },
        })
      );

    return TrialRecorder.of({ record });
  })
);
