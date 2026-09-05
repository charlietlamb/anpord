import type { Actor } from "@anpord/schema/domain/actor";
import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import { Clock, Context, Effect, Layer, Redacted } from "effect";
import { CredentialCipher } from "./cipher";
import { openValues } from "./connection-payload";
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

/**
 * A credential a run already committed to, named by the connection its cells
 * recorded.
 *
 * Distinct from ResolveCredential because there is no actor to check against.
 * A worker continuing a run is not deciding whether that run may use this
 * credential; a person with a session decided when the run was started, and
 * the cell stores what they chose. Scoped to the organization so a run can
 * still only reach its own.
 */
export interface BoundCredential {
  readonly connectionId: string;
  readonly organizationId: string;
}

export interface CredentialResolverShape {
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

    /* The organisation comes from the caller rather than from the row, so the
       predicate is a check on the row rather than a restatement of it. */
    const touch = (organizationId: string) => (row: ConnectionRow) =>
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((now) =>
          repository.touch(organizationId, row.id, new Date(now))
        ),
        Effect.ignore
      );

    return CredentialResolver.of({
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
      /* No actor, by design: a run that already recorded this connection was
         authorised when a person started it. Still bounded by the organization,
         so a run cannot reach another's credential. */
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
