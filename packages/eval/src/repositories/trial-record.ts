import { Database } from "@anpord/db/client";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { evalTrialJournal } from "@anpord/db/schema/evals/eval-trial-journal";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { IdGenerator } from "@anpord/ids/id";
import { and, eq, sql } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";
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
  /** Why it did not finish. Null said nothing, which is how a failed trial
   * looked identical to one nobody had started. */
  readonly failure?: string;
  readonly finishedAt: Date;
  readonly trialInternalId: string;
}

export interface SettleTrial {
  readonly finishedAt: Date;
  readonly outcome: TrialOutcome;
  readonly prepared: Readonly<Record<string, unknown>>;
  readonly sandboxId: string | null;
  readonly trialInternalId: string;

  readonly usage: HarnessUsage | null;
}

export interface AttachSandbox {
  readonly sandboxId: string;
  readonly trialInternalId: string;
}

interface OpenedTrial {
  /** The sandbox an earlier attempt of this trial left behind, if a process
   * died holding one. The new attempt destroys it before opening its own. */
  readonly priorSandboxId: Option.Option<string>;
  readonly trialInternalId: string;
}

export interface TrialRecorderShape {
  readonly abandon: (
    input: AbandonTrial
  ) => Effect.Effect<void, EvalStoreError>;

  readonly append: (
    input: AppendTrialEvents
  ) => Effect.Effect<void, EvalStoreError>;

  readonly attach: (
    input: AttachSandbox
  ) => Effect.Effect<void, EvalStoreError>;

  readonly open: (
    input: OpenTrial
  ) => Effect.Effect<OpenedTrial, EvalStoreError>;

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
          .set({
            failure: input.failure ?? null,
            finishedAt: input.finishedAt,
            status: "void",
          })
          .where(
            and(
              eq(evalTrial.internalId, input.trialInternalId),
              eq(evalTrial.status, "running")
            )
          )
      ).pipe(Effect.asVoid, Effect.withSpan("TrialRecorder.abandon"));

    const attach = (input: AttachSandbox) =>
      tryStore("trial.attach", () =>
        db
          .update(evalTrial)
          .set({ sandboxId: input.sandboxId })
          .where(eq(evalTrial.internalId, input.trialInternalId))
      ).pipe(
        Effect.asVoid,
        Effect.withSpan("TrialRecorder.attach"),
        Effect.annotateLogs({
          sandboxId: input.sandboxId,
          trialInternalId: input.trialInternalId,
        })
      );

    /* Reopened rather than inserted beside, because a resumed run reuses its
       cells and a trial is unique on its cell and ordinal. The first live
       resume died here on that constraint.

       The same trial, on a later attempt: keeping the row keeps the run the
       shape a reader already has, and the events of the attempt that did not
       finish are replaced rather than interleaved with the new one's. */
    const open = (input: OpenTrial) =>
      Effect.gen(function* () {
        const fresh = yield* ids.generate("evalTrial");

        const rows = yield* tryStore("trial.open", () =>
          db
            .insert(evalTrial)
            .values({
              attempt: 1,
              cellInternalId: input.cellInternalId,
              internalId: fresh,
              ordinal: input.ordinal,
              provider: input.provider,
              startedAt: input.startedAt,
              status: "running",
            })
            .onConflictDoUpdate({
              set: {
                attempt: sql`${evalTrial.attempt} + 1`,
                finishedAt: null,
                provider: input.provider,
                startedAt: input.startedAt,
                status: "running",
              },
              target: [evalTrial.cellInternalId, evalTrial.ordinal],
            })
            .returning({
              internalId: evalTrial.internalId,
              sandboxId: evalTrial.sandboxId,
            })
        );

        const trialInternalId = rows[0]?.internalId ?? fresh;
        const priorSandboxId = Option.fromNullable(rows[0]?.sandboxId);

        /* An earlier attempt's journal describes a run that did not happen.
           Cleared here rather than left to interleave with the new one. */
        yield* tryStore("trial.clearEvents", () =>
          db
            .delete(evalEvent)
            .where(eq(evalEvent.trialInternalId, trialInternalId))
        );

        yield* tryStore("trial.clearArchive", () =>
          db
            .delete(evalTrialJournal)
            .where(eq(evalTrialJournal.trialInternalId, trialInternalId))
        );

        return { priorSandboxId, trialInternalId };
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
            prepared: input.prepared,
            sandboxId: input.sandboxId,
            sandboxMs: input.outcome.sandboxMs,
            status: input.outcome.status,
            usage: input.usage === null ? null : { ...input.usage },
            verifySteps: input.outcome.verifySteps.map((step) => ({ ...step })),
            voidFields: [...input.outcome.voidFields],
          })
          .where(eq(evalTrial.internalId, input.trialInternalId))
      ).pipe(
        Effect.asVoid,
        Effect.withSpan("TrialRecorder.settle", {
          attributes: { status: input.outcome.status },
        })
      );

    return TrialRecorder.of({ abandon, attach, append, open, settle });
  })
);
