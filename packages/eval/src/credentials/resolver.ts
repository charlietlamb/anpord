import type { Actor } from "@anpord/schema/domain/actor";
import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import { Clock, Context, Effect, Layer, Redacted } from "effect";
import { CredentialCipher } from "./cipher";
import { openValues, sealValues } from "./connection-payload";
import {
  CredentialConnectionRepository,
  CredentialConnectionRepositoryLive,
} from "./connection-repository";
import type { ConnectionRow } from "./connection-row";
import type { CredentialError } from "./errors";

export interface ResolveCredential {
  readonly actor: Actor;
  readonly connectionId?: string;
  readonly integrationId: string;
}

/* No actor: a person authorised this connection when the run was started. Still
   scoped to the organization, so a run cannot reach another's credential. */
export interface BoundCredential {
  readonly connectionId: string;
  readonly organizationId: string;
}

export interface PersistCredential {
  readonly connectionId: string;
  readonly organizationId: string;
  readonly values: Readonly<Record<string, string>>;
}

export interface CredentialResolverShape {
  /* A harness that refreshes its own token leaves the stored copy spent, so
     the rotated material has to be written back before the sandbox goes. */
  readonly persist: (
    input: PersistCredential
  ) => Effect.Effect<void, CredentialError>;
  readonly resolve: (
    input: ResolveCredential
  ) => Effect.Effect<Redacted.Redacted<ResolvedCredential>, CredentialError>;
  readonly resolveBound: (
    input: BoundCredential
  ) => Effect.Effect<Redacted.Redacted<ResolvedCredential>, CredentialError>;
}

export class CredentialResolver extends Context.Tag(
  "@anpord/eval/CredentialResolver"
)<CredentialResolver, CredentialResolverShape>() {}

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

    /* The organisation comes from the caller, so this checks the row rather than
       restating it. */
    const touch = (organizationId: string) => (row: ConnectionRow) =>
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((now) =>
          repository.touch(organizationId, row.id, new Date(now))
        ),
        Effect.ignore
      );

    return CredentialResolver.of({
      persist: (input) =>
        repository.findBound(input.organizationId, input.connectionId).pipe(
          Effect.flatMap((row) =>
            sealValues(cipher, input.values, row).pipe(
              Effect.flatMap((sealedPayload) =>
                Clock.currentTimeMillis.pipe(
                  Effect.flatMap((now) =>
                    repository.reseal(
                      input.organizationId,
                      row.id,
                      sealedPayload,
                      new Date(now)
                    )
                  )
                )
              )
            )
          ),
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
