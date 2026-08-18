import { Database } from "@anpord/db/client";
import { prompt } from "@anpord/db/schema/prompts/prompts";
import type { OrganizationId } from "@anpord/schema/domain/actor";
import type { PromptId, PromptName } from "@anpord/schema/domain/prompts";
import { and, eq, isNull } from "drizzle-orm";
import { Context, Effect, Layer, type Option } from "effect";
import type { PromptStoreError } from "../domain/errors";
import type { OwnedPromptId } from "../domain/owned-prompt";
import type { PromptListParams, PromptListRow } from "./prompt-list-query";
import { selectPromptList } from "./prompt-list-query";
import { head, tryStore } from "./query";

type PromptRow = typeof prompt.$inferSelect;

export interface PromptRepositoryShape {
  readonly archive: (
    internalId: OwnedPromptId,
    archivedAt: Date
  ) => Effect.Effect<void, PromptStoreError>;
  readonly findById: (
    organizationId: OrganizationId,
    id: PromptId
  ) => Effect.Effect<Option.Option<PromptRow>, PromptStoreError>;
  /** Archived rows included, for reads. Archiving hides a prompt from the
   * dashboard; a service pinned to a version it already shipped keeps working,
   * which is what the public contract promises. */
  readonly findByIdIncludingArchived: (
    organizationId: OrganizationId,
    id: PromptId
  ) => Effect.Effect<Option.Option<PromptRow>, PromptStoreError>;
  /** Archived rows included. An id an archived prompt still holds is not free:
   * the unique index covers both, so treating it as free turns an ordinary
   * conflict into a store error the caller cannot act on. */
  readonly idExists: (
    organizationId: OrganizationId,
    id: PromptId
  ) => Effect.Effect<boolean, PromptStoreError>;
  readonly insert: (input: {
    readonly authorId: string | null;
    readonly description: string | null;
    readonly id: PromptId;
    readonly internalId: string;
    readonly name: PromptName;
    readonly organizationId: OrganizationId;
  }) => Effect.Effect<void, PromptStoreError>;
  readonly listByOrganization: (
    organizationId: OrganizationId,
    params: PromptListParams
  ) => Effect.Effect<readonly PromptListRow[], PromptStoreError>;
  readonly touch: (
    internalId: OwnedPromptId,
    updatedAt: Date
  ) => Effect.Effect<void, PromptStoreError>;
  readonly update: (
    internalId: OwnedPromptId,
    changes: {
      readonly description?: string;
      readonly id?: PromptId;
      readonly name?: PromptName;
    },
    updatedAt: Date
  ) => Effect.Effect<void, PromptStoreError>;
}

export class PromptRepository extends Context.Tag(
  "@anpord/prompts/PromptRepository"
)<PromptRepository, PromptRepositoryShape>() {}

export const PromptRepositoryLive = Layer.effect(
  PromptRepository,
  Effect.gen(function* () {
    const db = yield* Database;

    return {
      findById: (organizationId, id) =>
        tryStore("prompt.findById", () =>
          db
            .select()
            .from(prompt)
            .where(
              and(
                eq(prompt.organizationId, organizationId),
                eq(prompt.id, id),
                isNull(prompt.archivedAt)
              )
            )
            .limit(1)
        ).pipe(Effect.map(head)),

      findByIdIncludingArchived: (organizationId, id) =>
        tryStore("prompt.findByIdIncludingArchived", () =>
          db
            .select()
            .from(prompt)
            .where(
              and(eq(prompt.organizationId, organizationId), eq(prompt.id, id))
            )
            .limit(1)
        ).pipe(Effect.map(head)),

      idExists: (organizationId, id) =>
        tryStore("prompt.idExists", () =>
          db
            .select({ internalId: prompt.internalId })
            .from(prompt)
            .where(
              and(eq(prompt.organizationId, organizationId), eq(prompt.id, id))
            )
            .limit(1)
        ).pipe(Effect.map((rows) => rows.length > 0)),

      insert: (input) =>
        tryStore("prompt.insert", () =>
          db.insert(prompt).values({
            internalId: input.internalId,
            id: input.id,
            organizationId: input.organizationId,
            name: input.name,
            description: input.description,
            createdBy: input.authorId,
          })
        ).pipe(Effect.asVoid),

      listByOrganization: (organizationId, params) =>
        tryStore("prompt.listByOrganization", () =>
          selectPromptList(db, organizationId, params)
        ),

      update: (internalId, changes, updatedAt) =>
        tryStore("prompt.update", () =>
          db
            .update(prompt)
            .set({ ...changes, updatedAt })
            .where(eq(prompt.internalId, internalId))
        ).pipe(Effect.asVoid),

      touch: (internalId, updatedAt) =>
        tryStore("prompt.touch", () =>
          db
            .update(prompt)
            .set({ updatedAt })
            .where(eq(prompt.internalId, internalId))
        ).pipe(Effect.asVoid),

      archive: (internalId, archivedAt) =>
        tryStore("prompt.archive", () =>
          db
            .update(prompt)
            .set({ archivedAt })
            .where(eq(prompt.internalId, internalId))
        ).pipe(Effect.asVoid),
    } satisfies PromptRepositoryShape;
  })
);
