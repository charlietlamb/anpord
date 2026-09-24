import { Database } from "@anpord/db/client";
import { credentialConnection } from "@anpord/db/schema/credentials/connections";
import type { Actor } from "@anpord/schema/domain/actor";
import type { IntegrationAwareness } from "@anpord/schema/domain/credentials";
import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import { head, tryStore } from "../repositories/query";
import {
  insertClaimingDefault,
  type NewConnection,
  promoteToDefault,
} from "./connection-default";
import {
  selectActive,
  selectAllVisible,
  selectBound,
  selectPersonalOwners,
  selectVisible,
} from "./connection-lookup";
import type { ConnectionRow } from "./connection-row";
import { visibleTo } from "./connection-scope";
import {
  type CredentialError,
  connectionNotFound,
  storeUnavailable,
} from "./errors";
import { groupOwners } from "./integration-awareness";

export interface CredentialConnectionRepositoryShape {
  readonly awareness: (
    actor: Actor
  ) => Effect.Effect<readonly IntegrationAwareness[], CredentialError>;
  readonly find: (
    actor: Actor,
    id: string
  ) => Effect.Effect<ConnectionRow, CredentialError>;
  readonly findActive: (
    actor: Actor,
    integrationId: string,
    connectionId: string | undefined
  ) => Effect.Effect<ConnectionRow, CredentialError>;
  readonly findBound: (
    organizationId: string,
    connectionId: string
  ) => Effect.Effect<ConnectionRow, CredentialError>;
  readonly insert: (
    actor: Actor,
    row: NewConnection,
    wantsDefault: boolean
  ) => Effect.Effect<ConnectionRow, CredentialError>;
  readonly list: (
    actor: Actor
  ) => Effect.Effect<readonly ConnectionRow[], CredentialError>;
  readonly recordVerification: (
    actor: Actor,
    id: string,
    verified: boolean,
    now: Date
  ) => Effect.Effect<ConnectionRow, CredentialError>;
  readonly remove: (
    actor: Actor,
    id: string
  ) => Effect.Effect<void, CredentialError>;
  readonly reseal: (
    organizationId: string,
    id: string,
    sealedPayload: string,
    now: Date
  ) => Effect.Effect<void, CredentialError>;
  readonly rotate: (
    actor: Actor,
    row: ConnectionRow,
    sealedPayload: string,
    now: Date
  ) => Effect.Effect<ConnectionRow, CredentialError>;
  readonly setDefault: (
    actor: Actor,
    row: ConnectionRow,
    now: Date
  ) => Effect.Effect<ConnectionRow, CredentialError>;
  readonly touch: (
    organizationId: string,
    id: string,
    now: Date
  ) => Effect.Effect<void, CredentialError>;
}

export class CredentialConnectionRepository extends Context.Tag(
  "@anpord/eval/CredentialConnectionRepository"
)<CredentialConnectionRepository, CredentialConnectionRepositoryShape>() {}

const firstOrNotFound = (rows: readonly ConnectionRow[]) =>
  Effect.mapError(head(rows), connectionNotFound);

const stored = <A>(method: string, run: () => Promise<A>) =>
  tryStore(`CredentialConnectionRepository.${method}`, run).pipe(
    Effect.mapError(storeUnavailable),
    Effect.withSpan(`CredentialConnectionRepository.${method}`)
  );

export const CredentialConnectionRepositoryLive = Layer.effect(
  CredentialConnectionRepository,
  Effect.gen(function* () {
    const db = yield* Database;

    return CredentialConnectionRepository.of({
      awareness: (actor) =>
        stored("awareness", () => selectPersonalOwners(db, actor)).pipe(
          Effect.map(groupOwners)
        ),
      find: (actor, id) =>
        stored("find", () => selectVisible(db, actor, id)).pipe(
          Effect.flatMap(firstOrNotFound)
        ),
      findActive: (actor, integrationId, connectionId) =>
        stored("findActive", () =>
          selectActive(db, actor, integrationId, connectionId)
        ).pipe(Effect.flatMap(firstOrNotFound)),
      findBound: (organizationId, connectionId) =>
        stored("findBound", () =>
          selectBound(db, organizationId, connectionId)
        ).pipe(Effect.flatMap(firstOrNotFound)),
      insert: (actor, row, wantsDefault) =>
        stored("insert", () =>
          insertClaimingDefault(db, actor, row, wantsDefault)
        ).pipe(Effect.flatMap(firstOrNotFound)),
      list: (actor) => stored("list", () => selectAllVisible(db, actor)),
      recordVerification: (actor, id, verified, now) =>
        stored("recordVerification", () =>
          db
            .update(credentialConnection)
            .set({
              status: verified ? "active" : "invalid",
              updatedAt: now,
            })
            .where(
              and(
                visibleTo(actor.organizationId, actor.id),
                eq(credentialConnection.id, id)
              )
            )
            .returning()
        ).pipe(Effect.flatMap(firstOrNotFound)),
      remove: (actor, id) =>
        stored("remove", () =>
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
          Effect.flatMap((rows) =>
            rows.length === 0 ? Effect.fail(connectionNotFound()) : Effect.void
          )
        ),
      reseal: (organizationId, id, sealedPayload, now) =>
        stored("reseal", () =>
          db
            .update(credentialConnection)
            .set({ sealedPayload, updatedAt: now })
            .where(
              and(
                eq(credentialConnection.organizationId, organizationId),
                eq(credentialConnection.id, id)
              )
            )
        ).pipe(Effect.asVoid),
      rotate: (actor, row, sealedPayload, now) =>
        stored("rotate", () =>
          db
            .update(credentialConnection)
            .set({
              revision: row.revision + 1,
              sealedPayload,
              status: "active",
              updatedAt: now,
            })
            .where(
              and(
                visibleTo(actor.organizationId, actor.id),
                eq(credentialConnection.id, row.id)
              )
            )
            .returning()
        ).pipe(Effect.flatMap(firstOrNotFound)),
      setDefault: (actor, row, now) =>
        stored("setDefault", () => promoteToDefault(db, actor, row, now)).pipe(
          Effect.flatMap(firstOrNotFound)
        ),
      touch: (organizationId, id, now) =>
        stored("touch", () =>
          db
            .update(credentialConnection)
            .set({ lastUsedAt: now })
            .where(
              and(
                eq(credentialConnection.organizationId, organizationId),
                eq(credentialConnection.id, id)
              )
            )
        ).pipe(Effect.asVoid),
    });
  })
);
