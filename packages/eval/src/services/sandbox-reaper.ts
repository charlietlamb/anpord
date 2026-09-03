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

/**
 * Destroys the sandboxes of trials nothing is running any more.
 *
 * A sandbox is released by the scope that opened it, which covers every way a
 * trial can end inside a live process. It does not cover the process dying:
 * no finalizer runs, and the sandbox bills until the provider's own timeout,
 * which one provider does not set. The row still knows the id, so this reads
 * it back and finishes what the finalizer would have.
 */
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
        /* One sandbox that cannot be reached must not stop the rest, and a
           defect here must not stop the sweep. */
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

/* Longer than a worker may run, because a trial that started this long ago
   and still holds a sandbox has no process behind it. The worker's wall clock
   is compute time and a checkpointed wait keeps the sandbox live, so an hour
   of work can take more than an hour of clock. */
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
