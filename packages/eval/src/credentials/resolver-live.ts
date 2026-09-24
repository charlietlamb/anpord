import { Clock, Effect, Layer, Redacted } from "effect";
import { CredentialCipher } from "./cipher";
import { openValues, sealValues } from "./connection-payload";
import {
  CredentialConnectionRepository,
  CredentialConnectionRepositoryLive,
} from "./connection-repository";
import type { ConnectionRow } from "./connection-row";
import { CredentialResolver } from "./resolver";

export const CredentialResolverLive = Layer.effect(
  CredentialResolver,
  Effect.gen(function* () {
    const cipher = yield* CredentialCipher;
    const repository = yield* CredentialConnectionRepository;

    const openRow = (row: ConnectionRow) =>
      openValues(cipher, row).pipe(
        Effect.map((values) =>
          Redacted.make({
            authMethodId: row.authMethodId,
            connectionId: row.id,
            integrationId: row.integrationId,
            revision: row.revision,
            values: Redacted.value(values),
          })
        )
      );

    const touch = (organizationId: string) => (row: ConnectionRow) =>
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((now) =>
          repository.touch(organizationId, row.id, new Date(now))
        ),
        Effect.ignore
      );

    return CredentialResolver.of({
      persist: (input) =>
        Effect.gen(function* () {
          const row = yield* repository.findBound(
            input.organizationId,
            input.connectionId
          );
          const sealedPayload = yield* sealValues(cipher, input.values, row);
          const now = yield* Clock.currentTimeMillis;

          yield* repository.reseal(
            input.organizationId,
            row.id,
            sealedPayload,
            new Date(now)
          );
        }).pipe(
          Effect.withSpan("CredentialResolver.persist"),
          Effect.annotateLogs({
            connectionId: input.connectionId,
            organizationId: input.organizationId,
          })
        ),
      resolve: (input) =>
        repository
          .findActive(input.actor, input.integrationId, input.connectionId)
          .pipe(
            Effect.tap(touch(input.actor.organizationId)),
            Effect.flatMap(openRow),
            Effect.withSpan("CredentialResolver.resolve"),
            Effect.annotateLogs({
              credentialId: input.connectionId ?? "default",
              integrationId: input.integrationId,
              organizationId: input.actor.organizationId,
            })
          ),
      resolveBound: (input) =>
        repository.findBound(input.organizationId, input.connectionId).pipe(
          Effect.flatMap(openRow),
          Effect.withSpan("CredentialResolver.resolveBound"),
          Effect.annotateLogs({
            connectionId: input.connectionId,
            organizationId: input.organizationId,
          })
        ),
    });
  })
).pipe(Layer.provide(CredentialConnectionRepositoryLive));
