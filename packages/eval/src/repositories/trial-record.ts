import { Database } from "@anpord/db/client";
import { evalEvent } from "@anpord/db/schema/evals/eval-events";
import { evalTrialArtifact } from "@anpord/db/schema/evals/eval-trial-artifacts";
import { evalTrialJournal } from "@anpord/db/schema/evals/eval-trial-journal";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { IdGenerator } from "@anpord/ids/id";
import { EvalValidations } from "@anpord/schema/domain/eval-validations";
import type { EvalArtifact } from "@anpord/schema/domain/evals";
import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer, Option, Schema } from "effect";
import type { ProviderName } from "../domain/cell";
import type { EvalStoreError } from "../domain/errors";
import type { HarnessEvent, HarnessUsage } from "../domain/harness-event";
import type { TrialOutcome } from "../domain/trial";
import { interruptedValidation } from "../domain/validation-plan";
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
  readonly failure?: string;
  readonly finishedAt: Date;
  readonly trialInternalId: string;
}

export interface SettleTrial {
  readonly artifacts?: readonly EvalArtifact[];
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
  readonly recordValidations: (input: {
    readonly trialInternalId: string;
    readonly validations: typeof EvalValidations.Type;
  }) => Effect.Effect<void, EvalStoreError>;

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

    /* The sandbox id is cleared: the scope destroyed it before this finalizer
       writes, and a leftover id sends the reaper after a VM that is gone. */
    const abandon = (input: AbandonTrial) =>
      tryStore("trial.abandon", async () => {
        const [trial] = await db
          .select({ validations: evalTrial.validations })
          .from(evalTrial)
          .where(eq(evalTrial.internalId, input.trialInternalId));
        const validations = Schema.decodeUnknownSync(EvalValidations)(
          trial?.validations ?? []
        ).map((record) =>
          interruptedValidation(record, input.finishedAt.getTime())
        );
        return db
          .update(evalTrial)
          .set({
            failure: input.failure ?? null,
            finishedAt: input.finishedAt,
            sandboxId: null,
            status: "void",
            validations,
          })
          .where(
            and(
              eq(evalTrial.internalId, input.trialInternalId),
              eq(evalTrial.status, "running")
            )
          );
      }).pipe(Effect.asVoid, Effect.withSpan("TrialRecorder.abandon"));

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

    /* Reopened, not inserted beside: a resumed run reuses its cells and a trial
       is unique on its cell and ordinal. */
    const open = (input: OpenTrial) =>
      Effect.gen(function* () {
        const fresh = yield* ids.generate("evalTrial");

        const rows = yield* tryStore("trial.open", () =>
          db
            .insert(evalTrial)
            .values({
              cellInternalId: input.cellInternalId,
              internalId: fresh,
              ordinal: input.ordinal,
              provider: input.provider,
              startedAt: input.startedAt,
              status: "running",
            })
            .onConflictDoUpdate({
              set: {
                finishedAt: null,
                provider: input.provider,
                startedAt: input.startedAt,
                status: "running",
                validations: [],
                artifacts: [],
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

        yield* tryStore("trial.clearArtifacts", () =>
          db
            .delete(evalTrialArtifact)
            .where(eq(evalTrialArtifact.trialInternalId, trialInternalId))
        );

        /* An earlier attempt's journal would otherwise interleave with this one. */
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
              payload: event,
              seq: input.from + index,
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
        db.transaction(async (tx) => {
          await tx
            .delete(evalTrialArtifact)
            .where(
              eq(evalTrialArtifact.trialInternalId, input.trialInternalId)
            );
          if (input.artifacts?.length) {
            await tx
              .insert(evalTrialArtifact)
              .values(
                input.artifacts.map(({ path, sha256, content }) => ({
                  trialInternalId: input.trialInternalId,
                  path,
                  sha256,
                  content,
                }))
              )
              .onConflictDoNothing();
          }
          return tx
            .update(evalTrial)
            .set({
              artifacts: (input.artifacts ?? []).map(
                ({ content: _content, ...metadata }) => metadata
              ),
              commandCount: input.outcome.commandCount,
              exitCode: input.outcome.exitCode,
              finishedAt: input.finishedAt,
              modelMs: input.outcome.modelMs,
              passed: input.outcome.passed,
              prepared: input.prepared,
              judgments: input.outcome.judgments ?? [],
              ...(input.outcome.validations === undefined
                ? {}
                : { validations: input.outcome.validations }),
              sandboxId: input.sandboxId,
              sandboxMs: input.outcome.sandboxMs,
              status: input.outcome.status,
              usage: input.usage === null ? null : { ...input.usage },
              verifySteps: input.outcome.verifySteps.map((step) => ({
                ...step,
              })),
              voidFields: [...input.outcome.voidFields],
            })
            .where(eq(evalTrial.internalId, input.trialInternalId));
        })
      ).pipe(
        Effect.asVoid,
        Effect.withSpan("TrialRecorder.settle", {
          attributes: { status: input.outcome.status },
        })
      );

    const recordValidations: TrialRecorderShape["recordValidations"] = (
      input
    ) =>
      Effect.gen(function* () {
        const validations = yield* Schema.decodeUnknown(EvalValidations)(
          input.validations
        ).pipe(Effect.orDie);
        yield* tryStore("trial.recordValidations", () =>
          db
            .update(evalTrial)
            .set({ validations })
            .where(
              and(
                eq(evalTrial.internalId, input.trialInternalId),
                eq(evalTrial.status, "running")
              )
            )
        );
      }).pipe(Effect.withSpan("TrialRecorder.recordValidations"));

    return TrialRecorder.of({
      abandon,
      attach,
      append,
      open,
      settle,
      recordValidations,
    });
  })
);
