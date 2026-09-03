import { Database } from "@anpord/db/client";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { and, eq, lt, sql } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { ProviderName } from "../domain/cell";
import type { EvalStoreError } from "../domain/errors";
import { tryStore } from "./query";

export interface LiveSandbox {
  readonly organizationId: string;
  readonly provider: ProviderName;
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
              organizationId: evalRun.organizationId,
              provider: evalTrial.provider,
              sandboxConnectionId: evalCell.sandboxCredentialConnectionId,
              sandboxId: evalTrial.sandboxId,
              trialInternalId: evalTrial.internalId,
            })
            .from(evalTrial)
            .innerJoin(
              evalCell,
              eq(evalCell.internalId, evalTrial.cellInternalId)
            )
            .innerJoin(evalRun, eq(evalRun.internalId, evalCell.runInternalId))
            .where(
              and(
                /* The literal the partial index is defined over. */
                sql`${evalTrial.status} in ('queued', 'running') and ${evalTrial.sandboxId} is not null`,
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
                      provider: row.provider as ProviderName,
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
