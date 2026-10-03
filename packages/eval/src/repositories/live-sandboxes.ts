import { Database } from "@sphynx/db/client";
import { evalBatch } from "@sphynx/db/schema/evals/eval-batches";
import { evalRun } from "@sphynx/db/schema/evals/eval-runs";
import { evalTrial } from "@sphynx/db/schema/evals/eval-trials";
import { evalVariant } from "@sphynx/db/schema/evals/eval-variants";
import { and, eq, lt, sql } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { EvalStoreError } from "../domain/errors";
import { tryStore } from "./query";

export interface LiveSandbox {
  readonly organizationId: string;
  readonly provider: string;
  readonly sandboxId: string;
  readonly sandboxRef: string | null;
  readonly startedAt: Date;
  readonly trialInternalId: string;
}

export interface LiveSandboxesShape {
  readonly clear: (
    trialInternalId: string
  ) => Effect.Effect<void, EvalStoreError>;
  readonly startedBefore: (
    cutoff: Date
  ) => Effect.Effect<readonly LiveSandbox[], EvalStoreError>;
}

export class LiveSandboxes extends Context.Tag("@sphynx/eval/LiveSandboxes")<
  LiveSandboxes,
  LiveSandboxesShape
>() {}

export const LiveSandboxesLive = Layer.effect(
  LiveSandboxes,
  Effect.gen(function* () {
    const db = yield* Database;

    return LiveSandboxes.of({
      clear: (trialInternalId) =>
        tryStore("liveSandboxes.clear", () =>
          db
            .update(evalTrial)
            .set({ sandboxId: null })
            .where(eq(evalTrial.internalId, trialInternalId))
        ).pipe(Effect.asVoid, Effect.withSpan("LiveSandboxes.clear")),

      startedBefore: (cutoff) =>
        tryStore("liveSandboxes.startedBefore", () =>
          db
            .select({
              createdAt: evalTrial.createdAt,
              organizationId: evalBatch.organizationId,
              provider: evalVariant.sandbox,
              sandboxRef: evalRun.sandboxCredentialRef,
              sandboxId: evalTrial.sandboxId,
              startedAt: evalTrial.startedAt,
              trialInternalId: evalTrial.internalId,
            })
            .from(evalTrial)
            .innerJoin(evalRun, eq(evalRun.internalId, evalTrial.runInternalId))
            .innerJoin(
              evalBatch,
              eq(evalBatch.internalId, evalRun.batchInternalId)
            )
            .innerJoin(
              evalVariant,
              eq(evalVariant.internalId, evalRun.variantInternalId)
            )
            .where(
              and(
                sql`${evalTrial.sandboxId} is not null`,
                eq(evalBatch.local, false),
                lt(
                  sql`coalesce(${evalTrial.startedAt}, ${evalTrial.createdAt})`,
                  cutoff
                )
              )
            )
        ).pipe(
          Effect.map((rows) =>
            rows.flatMap((row): LiveSandbox[] =>
              row.sandboxId === null
                ? []
                : [
                    {
                      organizationId: row.organizationId,
                      provider: row.provider,
                      sandboxRef: row.sandboxRef,
                      sandboxId: row.sandboxId,
                      startedAt: row.startedAt ?? row.createdAt,
                      trialInternalId: row.trialInternalId,
                    },
                  ]
            )
          ),
          Effect.withSpan("LiveSandboxes.startedBefore")
        ),
    });
  })
);
