import { Database } from "@anpord/db/client";
import { evalBatch } from "@anpord/db/schema/evals/eval-batches";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { evalVariant } from "@anpord/db/schema/evals/eval-variants";
import { and, eq, lt, sql } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { EvalStoreError } from "../domain/errors";
import { tryStore } from "./query";

export interface LiveSandbox {
  readonly organizationId: string;
  readonly provider: string;
  readonly sandboxConnectionId: string | null;
  readonly sandboxId: string;
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

export class LiveSandboxes extends Context.Tag("@anpord/eval/LiveSandboxes")<
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
              organizationId: evalBatch.organizationId,
              provider: evalVariant.sandbox,
              sandboxConnectionId: evalRun.sandboxCredentialConnectionId,
              sandboxId: evalTrial.sandboxId,
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
                      sandboxConnectionId: row.sandboxConnectionId,
                      sandboxId: row.sandboxId,
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
