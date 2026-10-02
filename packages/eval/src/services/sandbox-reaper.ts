import { EvalSandbox } from "@sphynx/schema/domain/eval-definition";
import { Clock, Duration, Effect, Redacted, Schema } from "effect";
import { CredentialResolver } from "../credentials/resolver";
import {
  classifyReapFailure,
  type Reaped,
  type ReapFailure,
  settleFailure,
  summarizeReaps,
} from "../domain/reap-outcome";
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
    const now = yield* Clock.currentTimeMillis;

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

    const destroy = (found: LiveSandbox) =>
      Effect.gen(function* () {
        const provider = yield* Schema.decodeUnknown(EvalSandbox)(
          found.provider
        );
        yield* sandboxes.destroy({
          credentials: yield* credentialsFor(found),
          id: found.sandboxId,
          provider,
        });
      });

    const settle = (found: LiveSandbox, reason: ReapFailure) =>
      settleFailure(
        found.sandboxId,
        reason,
        Duration.millis(now - found.startedAt.getTime())
      );

    const reapOne = (found: LiveSandbox) =>
      destroy(found).pipe(
        Effect.as<Reaped>({ outcome: "destroyed", sandboxId: found.sandboxId }),
        Effect.catchAll((error) =>
          Effect.logDebug("sandbox not destroyed", error).pipe(
            Effect.as(settle(found, classifyReapFailure(error)))
          )
        ),
        Effect.catchAllDefect((defect) =>
          Effect.logDebug("sandbox not destroyed", defect).pipe(
            Effect.as(settle(found, "unexpected"))
          )
        ),
        Effect.tap((reaped) =>
          reaped.outcome === "retrying"
            ? Effect.void
            : live.clear(found.trialInternalId)
        ),
        Effect.catchTag("EvalStoreError", () =>
          Effect.succeed<Reaped>({
            outcome: "retrying",
            reason: "store-unavailable",
            sandboxId: found.sandboxId,
          })
        ),
        Effect.tap((reaped) =>
          Effect.logDebug("sandbox reaped").pipe(Effect.annotateLogs(reaped))
        ),
        Effect.annotateLogs({
          provider: found.provider,
          sandboxId: found.sandboxId,
          trialInternalId: found.trialInternalId,
        })
      );

    const found = yield* live.startedBefore(yield* cutoffBefore(olderThan));
    const summary = summarizeReaps(
      yield* Effect.forEach(found, reapOne, { concurrency: 4 })
    );

    if (found.length > 0) {
      const log =
        summary.failures.length === 0 ? Effect.logInfo : Effect.logWarning;
      yield* log("reaped leaked sandboxes").pipe(
        Effect.annotateLogs({ ...summary })
      );
    }

    return summary;
  });

export const SandboxReaperScheduleLive = sweepEvery(
  "SandboxReaper.reap",
  SWEEP_EVERY,
  reapSandboxes(LEAKED_AFTER)
);
