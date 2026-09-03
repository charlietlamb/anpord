import { Database } from "@anpord/db/client";
import { evalCell } from "@anpord/db/schema/evals/eval-cells";
import { evalRun } from "@anpord/db/schema/evals/eval-runs";
import { evalTrial } from "@anpord/db/schema/evals/eval-trials";
import { and, eq, lt, sql } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { ProviderName } from "../domain/cell";
import type { EvalStoreError } from "../domain/errors";
import { tryStore } from "./query";

/** A sandbox a trial still holds, with what a reaper needs to reach it. */
export interface LiveSandbox {
  readonly organizationId: string;
  readonly provider: ProviderName;
  /** The connection the sandbox was opened under, or null for the platform's
   * own account. A deleted connection reads as null too, which downgrades the
   * reap to the platform account rather than skipping it. */
  readonly sandboxConnectionId: string | null;
  readonly sandboxId: string;
  readonly trialInternalId: string;
}

export interface LiveSandboxesShape {
  readonly clear: (
    trialInternalId: string
  ) => Effect.Effect<void, EvalStoreError>;
  /** Trials whose current attempt started before the cutoff and still hold a
   * sandbox. Keyed on the trial's own start rather than the run's age, because
   * a resumed run is older than any cutoff and its trials are live. */
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
                /* Written as the literal the partial index is defined over, so
                   the planner can prove the match. A bound parameter here
                   reads the whole table. */
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
