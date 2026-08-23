import { Database } from "@anpord/db/client";
import { credentialConnection } from "@anpord/db/schema/credentials/connections";
import { IdGenerator } from "@anpord/ids/id";
import type { Actor } from "@anpord/schema/domain/actor";
import {
  type CreateCredentialConnection,
  CredentialConnection,
  CredentialValues,
  type ResolvedCredential,
} from "@anpord/schema/domain/credentials";
import { and, desc, eq, or } from "drizzle-orm";
import {
  Clock,
  Context,
  DateTime,
  Effect,
  Either,
  Layer,
  Redacted,
  Schema,
} from "effect";
import { tryStore } from "../repositories/query";
import { CredentialCipher } from "./cipher";
import { CredentialError } from "./errors";
import { validateCredential } from "./integrations";

type ConnectionRow = typeof credentialConnection.$inferSelect;

const visibleTo = (organizationId: string, userId: string) =>
  and(
    eq(credentialConnection.organizationId, organizationId),
    or(
      eq(credentialConnection.scope, "organization"),
      and(
        eq(credentialConnection.scope, "personal"),
        eq(credentialConnection.ownerUserId, userId)
      )
    )
  );

const defaultScope = (
  organizationId: string,
  userId: string,
  integrationId: string,
  scope: string
) =>
  and(
    eq(credentialConnection.organizationId, organizationId),
    eq(credentialConnection.integrationId, integrationId),
    eq(credentialConnection.scope, scope),
    scope === "personal"
      ? eq(credentialConnection.ownerUserId, userId)
      : undefined
  );

const contextOf = (row: {
  readonly id: string;
  readonly integrationId: string;
  readonly organizationId: string;
}) => `${row.organizationId}\0${row.id}\0${row.integrationId}`;

const summaryOf = (row: ConnectionRow): CredentialConnection =>
  Schema.validateSync(CredentialConnection)({
    authMethodId: row.authMethodId,
    createdAt: DateTime.unsafeMake(row.createdAt.getTime()),
    id: row.id,
    integrationId: row.integrationId,
    isDefault: row.isDefault,
    lastUsedAt:
      row.lastUsedAt === null
        ? null
        : DateTime.unsafeMake(row.lastUsedAt.getTime()),
    lastVerifiedAt:
      row.lastVerifiedAt === null
        ? null
        : DateTime.unsafeMake(row.lastVerifiedAt.getTime()),
    name: row.name,
    scope: row.scope,
    status: row.status,
  });

const notFound = () =>
  new CredentialError({
    code: "not-found",
    message: "Credential connection not found",
  });

const storeUnavailable = () =>
  new CredentialError({
    code: "internal",
    message: "Credential store is unavailable",
  });

const decodeValues = (payload: Redacted.Redacted<string>) =>
  Schema.decodeUnknown(Schema.parseJson(CredentialValues))(
    Redacted.value(payload)
  ).pipe(
    Effect.map(Redacted.make),
    Effect.mapError(
      () => new CredentialError({ message: "Credential payload is invalid" })
    )
  );

export interface CredentialConnectionsShape {
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

export interface ResolveCredential {
  readonly actor: Actor;
  readonly connectionId?: string;
  readonly integrationId: string;
}

export interface CredentialResolverShape {
  readonly resolve: (
    input: ResolveCredential
  ) => Effect.Effect<Redacted.Redacted<ResolvedCredential>, CredentialError>;
}

export class CredentialResolver extends Context.Tag(
  "@anpord/eval/CredentialResolver"
)<CredentialResolver, CredentialResolverShape>() {}

export const CredentialConnectionsLive = Layer.effect(
  CredentialConnections,
  Effect.gen(function* () {
    const cipher = yield* CredentialCipher;
    const db = yield* Database;
    const ids = yield* IdGenerator;

    const find = (actor: Actor, id: string) =>
      tryStore("credential.find", () =>
        db
          .select()
          .from(credentialConnection)
          .where(
            and(
              visibleTo(actor.organizationId, actor.id),
              eq(credentialConnection.id, id)
            )
          )
      ).pipe(
        Effect.mapError(storeUnavailable),
        Effect.flatMap((rows) =>
          rows[0] === undefined
            ? Effect.fail(notFound())
            : Effect.succeed(rows[0])
        )
      );

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
          const row = {
            authMethodId: input.authMethodId,
            createdBy: actor.isUser ? actor.id : null,
            id,
            integrationId: input.integrationId,
            name,
            organizationId: actor.organizationId,
            ownerUserId: input.scope === "personal" ? actor.id : null,
            scope: input.scope,
            sealedPayload: yield* cipher.seal(
              Redacted.make(JSON.stringify(values)),
              contextOf({
                id,
                integrationId: input.integrationId,
                organizationId: actor.organizationId,
              })
            ),
            status: "active",
          };

          const inserted = yield* tryStore("credential.create", () =>
            db.transaction(async (tx) => {
              const existing = await tx
                .select({ id: credentialConnection.id })
                .from(credentialConnection)
                .where(
                  defaultScope(
                    actor.organizationId,
                    actor.id,
                    input.integrationId,
                    input.scope
                  )
                )
                .limit(1);
              const isDefault = input.isDefault || existing.length === 0;

              if (isDefault) {
                await tx
                  .update(credentialConnection)
                  .set({ isDefault: false })
                  .where(
                    defaultScope(
                      actor.organizationId,
                      actor.id,
                      input.integrationId,
                      input.scope
                    )
                  );
              }
              return tx
                .insert(credentialConnection)
                .values({ ...row, isDefault })
                .returning();
            })
          ).pipe(Effect.mapError(storeUnavailable));

          yield* Effect.logInfo("credential created");
          return summaryOf(inserted[0] as ConnectionRow);
        }).pipe(
          Effect.withSpan("CredentialConnections.create"),
          Effect.annotateLogs({
            integrationId: input.integrationId,
            organizationId: actor.organizationId,
            scope: input.scope,
          })
        ),
      list: (actor) =>
        tryStore("credential.list", () =>
          db
            .select()
            .from(credentialConnection)
            .where(visibleTo(actor.organizationId, actor.id))
            .orderBy(
              desc(credentialConnection.isDefault),
              credentialConnection.name
            )
        ).pipe(
          Effect.map((rows) => rows.map(summaryOf)),
          Effect.mapError(storeUnavailable),
          Effect.withSpan("CredentialConnections.list"),
          Effect.annotateLogs({ organizationId: actor.organizationId })
        ),
      remove: (actor, id) =>
        tryStore("credential.remove", () =>
          db
            .delete(credentialConnection)
            .where(
              and(
                visibleTo(actor.organizationId, actor.id),
                eq(credentialConnection.id, id)
              )
            )
            .returning({ id: credentialConnection.id })
        ).pipe(
          Effect.mapError(storeUnavailable),
          Effect.flatMap((rows) =>
            rows.length === 0 ? Effect.fail(notFound()) : Effect.void
          ),
          Effect.withSpan("CredentialConnections.remove"),
          Effect.annotateLogs({
            credentialId: id,
            organizationId: actor.organizationId,
          })
        ),
      rotate: (actor, id, input) =>
        Effect.gen(function* () {
          const selected = yield* find(actor, id);
          const values = yield* validateCredential(
            selected.integrationId,
            selected.authMethodId,
            input
          );
          const now = new Date(yield* Clock.currentTimeMillis);
          const sealedPayload = yield* cipher.seal(
            Redacted.make(JSON.stringify(values)),
            contextOf(selected)
          );
          const rows = yield* tryStore("credential.rotate", () =>
            db
              .update(credentialConnection)
              .set({
                lastVerifiedAt: null,
                revision: selected.revision + 1,
                sealedPayload,
                status: "active",
                updatedAt: now,
              })
              .where(eq(credentialConnection.id, selected.id))
              .returning()
          ).pipe(Effect.mapError(storeUnavailable));
          return summaryOf(rows[0] as ConnectionRow);
        }).pipe(
          Effect.withSpan("CredentialConnections.rotate"),
          Effect.annotateLogs({
            credentialId: id,
            organizationId: actor.organizationId,
          })
        ),
      setDefault: (actor, id) =>
        Effect.gen(function* () {
          const selected = yield* find(actor, id);
          const now = new Date(yield* Clock.currentTimeMillis);
          const rows = yield* tryStore("credential.setDefault", () =>
            db.transaction(async (tx) => {
              await tx
                .update(credentialConnection)
                .set({ isDefault: false })
                .where(
                  defaultScope(
                    actor.organizationId,
                    actor.id,
                    selected.integrationId,
                    selected.scope
                  )
                );
              return tx
                .update(credentialConnection)
                .set({ isDefault: true, updatedAt: now })
                .where(eq(credentialConnection.id, selected.id))
                .returning();
            })
          ).pipe(Effect.mapError(storeUnavailable));
          return summaryOf(rows[0] as ConnectionRow);
        }).pipe(
          Effect.withSpan("CredentialConnections.setDefault"),
          Effect.annotateLogs({
            credentialId: id,
            organizationId: actor.organizationId,
          })
        ),
      verify: (actor, id) =>
        Effect.gen(function* () {
          const selected = yield* find(actor, id);
          const checked = yield* cipher
            .open(selected.sealedPayload, contextOf(selected))
            .pipe(
              Effect.flatMap(decodeValues),
              Effect.flatMap((values) =>
                validateCredential(
                  selected.integrationId,
                  selected.authMethodId,
                  Redacted.value(values)
                )
              ),
              Effect.either
            );
          const now = new Date(yield* Clock.currentTimeMillis);
          const rows = yield* tryStore("credential.verify", () =>
            db
              .update(credentialConnection)
              .set({
                lastVerifiedAt: Either.isRight(checked) ? now : null,
                status: Either.isRight(checked) ? "active" : "invalid",
                updatedAt: now,
              })
              .where(eq(credentialConnection.id, selected.id))
              .returning()
          ).pipe(Effect.mapError(storeUnavailable));

          if (Either.isLeft(checked)) {
            return yield* Effect.fail(checked.left);
          }

          return summaryOf(rows[0] as ConnectionRow);
        }).pipe(
          Effect.withSpan("CredentialConnections.verify"),
          Effect.annotateLogs({
            credentialId: id,
            organizationId: actor.organizationId,
          })
        ),
    });
  })
);

export const CredentialResolverLive = Layer.effect(
  CredentialResolver,
  Effect.gen(function* () {
    const cipher = yield* CredentialCipher;
    const db = yield* Database;

    const resolve = (input: ResolveCredential) =>
      tryStore("credential.resolve", () =>
        db
          .select()
          .from(credentialConnection)
          .where(
            and(
              visibleTo(input.actor.organizationId, input.actor.id),
              eq(credentialConnection.integrationId, input.integrationId),
              eq(credentialConnection.status, "active"),
              input.connectionId === undefined
                ? eq(credentialConnection.isDefault, true)
                : eq(credentialConnection.id, input.connectionId)
            )
          )
          .orderBy(
            desc(credentialConnection.scope),
            desc(credentialConnection.updatedAt)
          )
          .limit(1)
      ).pipe(
        Effect.mapError(storeUnavailable),
        Effect.flatMap((rows) =>
          rows[0] === undefined
            ? Effect.fail(notFound())
            : Effect.succeed(rows[0])
        ),
        Effect.tap((row) =>
          Clock.currentTimeMillis.pipe(
            Effect.flatMap((now) =>
              tryStore("credential.touch", () =>
                db
                  .update(credentialConnection)
                  .set({ lastUsedAt: new Date(now) })
                  .where(eq(credentialConnection.id, row.id))
              )
            ),
            Effect.ignore
          )
        ),
        Effect.flatMap((row) =>
          cipher
            .open(row.sealedPayload, contextOf(row))
            .pipe(Effect.map((payload) => ({ payload, row })))
        )
      );

    return CredentialResolver.of({
      resolve: (input) =>
        resolve(input).pipe(
          Effect.flatMap(({ payload, row }) =>
            decodeValues(payload).pipe(
              Effect.map((values) =>
                Redacted.make({
                  authMethodId: row.authMethodId,
                  connectionId: row.id,
                  integrationId: row.integrationId,
                  revision: row.revision,
                  values: Redacted.value(values),
                })
              )
            )
          ),
          Effect.withSpan("CredentialResolver.resolve"),
          Effect.annotateLogs({
            credentialId: input.connectionId ?? "default",
            integrationId: input.integrationId,
            organizationId: input.actor.organizationId,
          })
        ),
    });
  })
);

export const layerTestResolver = (
  values: CredentialValues = {}
): Layer.Layer<CredentialResolver> =>
  Layer.succeed(
    CredentialResolver,
    CredentialResolver.of({
      resolve: (input) =>
        Effect.succeed(
          Redacted.make({
            authMethodId: "test",
            connectionId: input.connectionId ?? "test",
            integrationId: input.integrationId,
            revision: 1,
            values,
          })
        ),
    })
  );
