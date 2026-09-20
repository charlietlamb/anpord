import { credentialIntegrations } from "@anpord/eval/credentials/integrations";
import { CredentialResolver } from "@anpord/eval/credentials/resolver";
import { Forbidden, NotFound } from "@anpord/schema/domain/errors";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import type { CredentialLeaseRequest } from "@anpord/schema/public/evals-api";
import { Clock, DateTime, Effect, Redacted } from "effect";
import { reportedRun } from "./reported-trials";

const LEASE_MINUTES = 15;
const MILLIS_PER_MINUTE = 60_000;

const LEASABLE = new Set(["harness", "model"]);

const leasable = (integrationId: string) =>
  LEASABLE.has(
    credentialIntegrations.find(({ id }) => id === integrationId)?.category ??
      ""
  );

export const leaseCredentials = ({ harness, id }: CredentialLeaseRequest) =>
  Effect.gen(function* () {
    yield* reportedRun(id);

    if (!leasable(harness)) {
      return yield* new Forbidden({
        message: `Credentials for ${harness} are not leased to a caller`,
      });
    }

    const actor = yield* CurrentActor;
    const resolver = yield* CredentialResolver;

    const credential = yield* resolver
      .resolve({ actor, integrationId: harness })
      .pipe(
        Effect.mapError(
          () =>
            new NotFound({
              message: `No ${harness} credential is connected for this organization`,
            })
        )
      );

    const now = yield* Clock.currentTimeMillis;

    return {
      expiresAt: DateTime.unsafeMake(now + LEASE_MINUTES * MILLIS_PER_MINUTE),
      values: Redacted.value(credential).values,
    };
  }).pipe(
    Effect.withSpan("Evals.leaseCredentials", {
      attributes: { harness, runId: id },
    }),
    Effect.annotateLogs({ harness, runId: id })
  );
