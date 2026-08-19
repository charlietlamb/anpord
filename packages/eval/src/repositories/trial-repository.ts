import { Database } from "@anpord/db/client";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { IdGenerator } from "@anpord/ids/id";
import { eq } from "drizzle-orm";
import { Context, Effect, Layer, type Option } from "effect";
import type { ProviderName } from "../domain/cell";
import type { EvalStoreError } from "../domain/errors";
import type { TrialOutcome, TrialStatus } from "../domain/trial";
import { head, tryStore } from "./query";

type TrialRow = typeof evalTrial.$inferSelect;

export interface TrialRepositoryShape {
  readonly claim: (
    internalId: string,
    sandboxId: string,
    startedAt: Date
  ) => Effect.Effect<void, EvalStoreError>;
  readonly fail: (input: {
    readonly failure: string;
    readonly finishedAt: Date;
    readonly internalId: string;
    readonly status: TrialStatus;
  }) => Effect.Effect<void, EvalStoreError>;
  readonly findById: (
    internalId: string
  ) => Effect.Effect<Option.Option<TrialRow>, EvalStoreError>;
  readonly insert: (input: {
    readonly cellInternalId: string;
    readonly ordinal: number;
    readonly provider: ProviderName;
  }) => Effect.Effect<TrialRow, EvalStoreError>;
  readonly listByCell: (
    cellInternalId: string
  ) => Effect.Effect<readonly TrialRow[], EvalStoreError>;
  readonly settle: (input: {
    readonly attempt: number;
    readonly finishedAt: Date;
    readonly internalId: string;
    readonly outcome: TrialOutcome;
  }) => Effect.Effect<void, EvalStoreError>;
}

export class TrialRepository extends Context.Tag(
  "@anpord/eval/TrialRepository"
)<TrialRepository, TrialRepositoryShape>() {}

export const TrialRepositoryLive = Layer.effect(
  TrialRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    const ids = yield* IdGenerator;

    const insert: TrialRepositoryShape["insert"] = (input) =>
      Effect.gen(function* () {
        const internalId = yield* ids.generate("evalTrial");

        const rows = yield* tryStore("trial.insert", () =>
          db
            .insert(evalTrial)
            .values({
              cellInternalId: input.cellInternalId,
              internalId,
              ordinal: input.ordinal,
              provider: input.provider,
              status: "queued",
            })
            .returning()
        );

        return rows[0] as TrialRow;
      });

    return TrialRepository.of({
      /* The sandbox id is written before the sandbox is used, so a trial whose
         process dies still names the thing that has to be cleaned up. */
      claim: (internalId, sandboxId, startedAt) =>
        tryStore("trial.claim", () =>
          db
            .update(evalTrial)
            .set({ sandboxId, startedAt, status: "running" })
            .where(eq(evalTrial.internalId, internalId))
        ).pipe(Effect.asVoid),

      fail: (input) =>
        tryStore("trial.fail", () =>
          db
            .update(evalTrial)
            .set({
              failure: input.failure,
              finishedAt: input.finishedAt,
              status: input.status,
            })
            .where(eq(evalTrial.internalId, input.internalId))
        ).pipe(Effect.asVoid),

      findById: (internalId) =>
        tryStore("trial.findById", () =>
          db
            .select()
            .from(evalTrial)
            .where(eq(evalTrial.internalId, internalId))
        ).pipe(Effect.map(head)),

      insert,

      listByCell: (cellInternalId) =>
        tryStore("trial.listByCell", () =>
          db
            .select()
            .from(evalTrial)
            .where(eq(evalTrial.cellInternalId, cellInternalId))
            .orderBy(evalTrial.ordinal)
        ),

      settle: (input) =>
        tryStore("trial.settle", () =>
          db
            .update(evalTrial)
            .set({
              attempt: input.attempt,
              commandCount: input.outcome.commandCount,
              exitCode: input.outcome.exitCode,
              finishedAt: input.finishedAt,
              modelMs: input.outcome.modelMs,
              passed: input.outcome.passed,
              sandboxMs: input.outcome.sandboxMs,
              status: input.outcome.status,
              voidFields: [...input.outcome.voidFields],
            })
            .where(eq(evalTrial.internalId, input.internalId))
        ).pipe(Effect.asVoid),
    });
  })
);
