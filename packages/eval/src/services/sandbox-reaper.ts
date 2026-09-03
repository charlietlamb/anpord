import {
  Clock,
  Context,
  Duration,
  Effect,
  Layer,
  Redacted,
  Schedule,
} from "effect";
import { CredentialResolver } from "../credentials/connections";
import type { EvalStoreError } from "../domain/errors";
import { SandboxProvider } from "../ports/sandbox";
import {
  type LiveSandbox,
  LiveSandboxes,
} from "../repositories/live-sandboxes";
import { SWEEP_EVERY } from "./reconciler";

interface Reaped {
  readonly destroyed: number;
  readonly failed: number;
}

export interface SandboxReaperShape {
  readonly reap: (input: {
    readonly olderThan: Duration.Duration;
  }) => Effect.Effect<Reaped, EvalStoreError>;
}

export class SandboxReaper extends Context.Tag("@anpord/eval/SandboxReaper")<
  SandboxReaper,
  SandboxReaperShape
>() {}

/* Finishes what a scope finalizer would have, for a process that died. */
export const SandboxReaperLive = Layer.effect(
  SandboxReaper,
  Effect.gen(function* () {
    const credentials = yield* CredentialResolver;
    const live = yield* LiveSandboxes;
    const sandboxes = yield* SandboxProvider;

    const credentialsFor = (found: LiveSandbox) =>
      found.sandboxConnectionId === null
        ? Effect.succeed(undefined)
        : credentials
            .resolveBound({
              connectionId: found.sandboxConnectionId,
              organizationId: found.organizationId,
            })
            .pipe(
              Effect.map((resolved) =>
                Redacted.make(Redacted.value(resolved).values)
              )
            );

    const reapOne = (found: LiveSandbox) =>
      Effect.gen(function* () {
        yield* sandboxes.destroy({
          credentials: yield* credentialsFor(found),
          id: found.sandboxId,
          provider: found.provider,
        });
        yield* live.clear(found.trialInternalId);
        return true;
      }).pipe(
        Effect.catchAllCause((cause) =>
          Effect.logWarning("sandbox not reaped", cause).pipe(Effect.as(false))
        ),
        Effect.annotateLogs({
          provider: found.provider,
          sandboxId: found.sandboxId,
          trialInternalId: found.trialInternalId,
        })
      );

    const reap = (input: { readonly olderThan: Duration.Duration }) =>
      Effect.gen(function* () {
        const now = yield* Clock.currentTimeMillis;
        const cutoff = new Date(now - Duration.toMillis(input.olderThan));
        const found = yield* live.startedBefore(cutoff);
        const outcomes = yield* Effect.forEach(found, reapOne, {
          concurrency: 4,
        });
        const destroyed = outcomes.filter(Boolean).length;
        const reaped = { destroyed, failed: outcomes.length - destroyed };

        if (found.length > 0) {
          yield* Effect.logWarning("reaped leaked sandboxes").pipe(
            Effect.annotateLogs(reaped)
          );
        }

        return reaped;
      }).pipe(Effect.withSpan("SandboxReaper.reap"));

    return SandboxReaper.of({ reap });
  })
);

/* Past the worker's wall clock, with room for a checkpointed wait. */
const LEAKED_AFTER = Duration.minutes(90);

export const SandboxReaperScheduleLive = Layer.scopedDiscard(
  Effect.gen(function* () {
    const reaper = yield* SandboxReaper;

    yield* reaper.reap({ olderThan: LEAKED_AFTER }).pipe(
      Effect.catchAllCause((cause) =>
        Effect.logError("sandbox reap failed", cause)
      ),
      Effect.repeat(Schedule.spaced(SWEEP_EVERY)),
      Effect.forkScoped
    );
  })
);
