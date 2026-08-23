import { Database } from "@anpord/db/client";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { IdGenerator } from "@anpord/ids/id";
import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { ProviderName } from "../domain/cell";
import type { EvalStoreError } from "../domain/errors";
import type { HarnessEvent, HarnessUsage } from "../domain/harness-event";
import { momentOf } from "../domain/harness-event";
import type { TrialOutcome } from "../domain/trial";
import { tryStore } from "./query";

export interface OpenTrial {
  readonly cellInternalId: string;
  readonly ordinal: number;
  readonly provider: ProviderName;
  readonly startedAt: Date;
}

export interface AppendTrialEvents {
  readonly events: readonly HarnessEvent[];

  readonly from: number;
  readonly trialInternalId: string;
}

export interface AbandonTrial {
  readonly finishedAt: Date;
  readonly trialInternalId: string;
}

export interface SettleTrial {
  readonly finishedAt: Date;
  readonly outcome: TrialOutcome;
  readonly sandboxId: string | null;
  readonly trialInternalId: string;

  readonly usage: HarnessUsage | null;
}

export interface TrialRecorderShape {
  readonly abandon: (
    input: AbandonTrial
  ) => Effect.Effect<void, EvalStoreError>;

  readonly append: (
    input: AppendTrialEvents
  ) => Effect.Effect<void, EvalStoreError>;

  readonly open: (input: OpenTrial) => Effect.Effect<string, EvalStoreError>;

  readonly settle: (input: SettleTrial) => Effect.Effect<void, EvalStoreError>;
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

    const abandon = (input: AbandonTrial) =>
      tryStore("trial.abandon", () =>
        db
          .update(evalTrial)
          .set({ finishedAt: input.finishedAt, status: "void" })
          .where(
            and(
              eq(evalTrial.internalId, input.trialInternalId),
              eq(evalTrial.status, "running")
            )
          )
      ).pipe(Effect.asVoid, Effect.withSpan("TrialRecorder.abandon"));

    const open = (input: OpenTrial) =>
      Effect.gen(function* () {
        const trialInternalId = yield* ids.generate("evalTrial");

        yield* tryStore("trial.open", () =>
          db.insert(evalTrial).values({
            attempt: 1,
            cellInternalId: input.cellInternalId,
            internalId: trialInternalId,
            ordinal: input.ordinal,
            provider: input.provider,
            startedAt: input.startedAt,
            status: "running",
          })
        );

        return trialInternalId;
      }).pipe(
        Effect.withSpan("TrialRecorder.open", {
          attributes: { ordinal: input.ordinal, provider: input.provider },
        })
      );

    const append = (input: AppendTrialEvents) =>
      Effect.gen(function* () {
        if (input.events.length === 0) {
          return;
        }

        const rows = yield* Effect.forEach(input.events, (event, index) =>
          ids.generate("evalEvent").pipe(
            Effect.map((internalId) => ({
              internalId,
              kind: event._tag,

              occurredAt: momentOf(event.at),
              payload: event,
              seq: input.from + index,
              startedAt: momentOf(
                event._tag === "Command" ? event.startedAt : undefined
              ),
              trialInternalId: input.trialInternalId,
            }))
          )
        );

        yield* tryStore("trial.append", () =>
          db.insert(evalEvent).values(rows).onConflictDoNothing()
        );
      }).pipe(
        Effect.withSpan("TrialRecorder.append", {
          attributes: { events: input.events.length },
        })
      );

    const settle = (input: SettleTrial) =>
      tryStore("trial.settle", () =>
        db
          .update(evalTrial)
          .set({
            commandCount: input.outcome.commandCount,
            exitCode: input.outcome.exitCode,
            finishedAt: input.finishedAt,
            modelMs: input.outcome.modelMs,
            passed: input.outcome.passed,
            sandboxId: input.sandboxId,
            sandboxMs: input.outcome.sandboxMs,
            status: input.outcome.status,
            usage: input.usage === null ? null : { ...input.usage },
            voidFields: [...input.outcome.voidFields],
          })
          .where(eq(evalTrial.internalId, input.trialInternalId))
      ).pipe(
        Effect.asVoid,
        Effect.withSpan("TrialRecorder.settle", {
          attributes: { status: input.outcome.status },
        })
      );

    return TrialRecorder.of({ abandon, append, open, settle });
  })
);
