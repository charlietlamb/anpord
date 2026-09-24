import { EvalSandbox } from "@anpord/schema/domain/evals";
import { Duration, Effect, Redacted, Schema } from "effect";
import { CredentialResolver } from "../credentials/resolver";
import { SandboxProvider } from "../ports/sandbox";
import {
  type LiveSandbox,
  LiveSandboxes,
} from "../repositories/live-sandboxes";
import { cutoffBefore, SWEEP_EVERY, sweepEvery } from "./sweep";

const LEAKED_AFTER = Duration.minutes(90);

export const reapSandboxes = (olderThan: Duration.Duration) =>
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
          provider: yield* Schema.decodeUnknown(EvalSandbox)(found.provider),
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

    const found = yield* live.startedBefore(yield* cutoffBefore(olderThan));
    const outcomes = yield* Effect.forEach(found, reapOne, { concurrency: 4 });
    const destroyed = outcomes.filter(Boolean).length;
    const reaped = { destroyed, failed: outcomes.length - destroyed };

    if (found.length > 0) {
      yield* Effect.logWarning("reaped leaked sandboxes").pipe(
        Effect.annotateLogs(reaped)
      );
    }

    return reaped;
  });

export const SandboxReaperScheduleLive = sweepEvery(
  "SandboxReaper.reap",
  SWEEP_EVERY,
  reapSandboxes(LEAKED_AFTER)
);
