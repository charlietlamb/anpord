import { IdGenerator } from "@anpord/ids/id";
import type { Actor } from "@anpord/schema/domain/actor";
import type {
  CreateCredentialConnection,
  CredentialConnection,
  CredentialValues,
  IntegrationAwareness,
} from "@anpord/schema/domain/credentials";
import { Clock, Context, Effect, Layer } from "effect";
import { CredentialCipher } from "./cipher";
import { sealValues } from "./connection-payload";
import {
  CredentialConnectionRepository,
  CredentialConnectionRepositoryLive,
} from "./connection-repository";
import { summaryOf } from "./connection-row";
import { verifyConnection } from "./connection-verification";
import { CredentialError } from "./errors";
import { validateCredential } from "./integrations";

export interface CredentialConnectionsShape {
  readonly awareness: (
    actor: Actor
  ) => Effect.Effect<readonly IntegrationAwareness[], CredentialError>;
  readonly create: (
    actor: Actor,
    input: CreateCredentialConnection
  ) => Effect.Effect<CredentialConnection, CredentialError>;
  readonly list: (
    actor: Actor
  ) => Effect.Effect<readonly CredentialConnection[], CredentialError>;
  readonly remove: (
    actor: Actor,
    id: string
  ) => Effect.Effect<void, CredentialError>;
  readonly rotate: (
    actor: Actor,
    id: string,
    values: CredentialValues
  ) => Effect.Effect<CredentialConnection, CredentialError>;
  readonly setDefault: (
    actor: Actor,
    id: string
  ) => Effect.Effect<CredentialConnection, CredentialError>;
  readonly verify: (
    actor: Actor,
    id: string
  ) => Effect.Effect<CredentialConnection, CredentialError>;
}

export class CredentialConnections extends Context.Tag(
  "@anpord/eval/CredentialConnections"
)<CredentialConnections, CredentialConnectionsShape>() {}

export const CredentialConnectionsLive = Layer.effect(
  CredentialConnections,
  Effect.gen(function* () {
    const cipher = yield* CredentialCipher;
    const ids = yield* IdGenerator;
    const repository = yield* CredentialConnectionRepository;

    return CredentialConnections.of({
      create: (actor, input) =>
        Effect.gen(function* () {
          if (input.scope === "personal" && !actor.isUser) {
            return yield* Effect.fail(
              new CredentialError({
                message: "API keys cannot own personal credentials",
              })
            );
          }

          const name = input.name.trim();
          if (name.length === 0) {
            return yield* Effect.fail(
              new CredentialError({ message: "Connection name is required" })
            );
          }

          const values = yield* validateCredential(
            input.integrationId,
            input.authMethodId,
            input.values
          );
          const id = yield* ids.generate("credentialConnection");
          const inserted = yield* repository.insert(
            actor,
            {
              authMethodId: input.authMethodId,
              createdBy: actor.isUser ? actor.id : null,
              id,
              integrationId: input.integrationId,
              name,
              organizationId: actor.organizationId,
              ownerUserId: input.scope === "personal" ? actor.id : null,
              scope: input.scope,
              sealedPayload: yield* sealValues(cipher, values, {
                id,
                integrationId: input.integrationId,
                organizationId: actor.organizationId,
              }),
              status: "active",
            },
            input.isDefault
          );

          yield* Effect.logInfo("credential created");
          return summaryOf(inserted);
        }).pipe(
          Effect.withSpan("CredentialConnections.create"),
          Effect.annotateLogs({
            integrationId: input.integrationId,
            organizationId: actor.organizationId,
            scope: input.scope,
          })
        ),
      awareness: (actor) =>
        repository
          .awareness(actor)
          .pipe(
            Effect.withSpan("CredentialConnections.awareness"),
            Effect.annotateLogs({ organizationId: actor.organizationId })
          ),
      list: (actor) =>
        repository.list(actor).pipe(
          Effect.map((rows) => rows.map(summaryOf)),
          Effect.withSpan("CredentialConnections.list"),
          Effect.annotateLogs({ organizationId: actor.organizationId })
        ),
      remove: (actor, id) =>
        repository.remove(actor, id).pipe(
          Effect.withSpan("CredentialConnections.remove"),
          Effect.annotateLogs({
            credentialId: id,
            organizationId: actor.organizationId,
          })
        ),
      rotate: (actor, id, input) =>
        Effect.gen(function* () {
          const selected = yield* repository.find(actor, id);
          const values = yield* validateCredential(
            selected.integrationId,
            selected.authMethodId,
            input
          );
          const now = new Date(yield* Clock.currentTimeMillis);
          const sealedPayload = yield* sealValues(cipher, values, selected);
          return summaryOf(
            yield* repository.rotate(selected, sealedPayload, now)
          );
        }).pipe(
          Effect.withSpan("CredentialConnections.rotate"),
          Effect.annotateLogs({
            credentialId: id,
            organizationId: actor.organizationId,
          })
        ),
      setDefault: (actor, id) =>
        Effect.gen(function* () {
          const selected = yield* repository.find(actor, id);
          const now = new Date(yield* Clock.currentTimeMillis);
          return summaryOf(yield* repository.setDefault(actor, selected, now));
        }).pipe(
          Effect.withSpan("CredentialConnections.setDefault"),
          Effect.annotateLogs({
            credentialId: id,
            organizationId: actor.organizationId,
          })
        ),
      verify: verifyConnection(cipher, repository),
    });
  })
).pipe(Layer.provide(CredentialConnectionRepositoryLive));
