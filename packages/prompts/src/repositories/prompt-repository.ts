import { Database } from "@anpord/db/client";
import { prompt } from "@anpord/db/schema/prompts/prompts";
import type { OrganizationId } from "@anpord/schema/actor";
import type { PromptId, PromptName } from "@anpord/schema/prompts";
import { and, eq, isNull } from "drizzle-orm";
import { Context, Effect, Layer, type Option } from "effect";
import type { PromptStoreError } from "../domain/errors";
import type { PromptListRow } from "./prompt-list-query";
import { selectPromptList } from "./prompt-list-query";
import { head, query } from "./query";

type PromptRow = typeof prompt.$inferSelect;

export interface PromptRepositoryShape {
  readonly archive: (
    internalId: string,
    archivedAt: Date
  ) => Effect.Effect<void, PromptStoreError>;
  readonly findById: (
    organizationId: OrganizationId,
    id: PromptId
  ) => Effect.Effect<Option.Option<PromptRow>, PromptStoreError>;
  readonly insert: (input: {
    readonly actorId: string;
    readonly description: string | null;
    readonly id: PromptId;
    readonly internalId: string;
    readonly name: PromptName;
    readonly organizationId: OrganizationId;
  }) => Effect.Effect<void, PromptStoreError>;
  readonly listByOrganization: (
    organizationId: OrganizationId
  ) => Effect.Effect<readonly PromptListRow[], PromptStoreError>;
  readonly touch: (
    internalId: string,
    updatedAt: Date
  ) => Effect.Effect<void, PromptStoreError>;
  readonly update: (
    internalId: string,
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
      /** The public slug is unique per organization, so scope and handle together. */
      findById: (organizationId, id) =>
        query("prompt.findById", () =>
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

      insert: (input) =>
        query("prompt.insert", () =>
          db.insert(prompt).values({
            internalId: input.internalId,
            id: input.id,
            organizationId: input.organizationId,
            name: input.name,
            description: input.description,
            createdBy: input.actorId,
          })
        ).pipe(Effect.asVoid),

      /** Latest and production come from different sources, so both are joined. */
      listByOrganization: (organizationId) =>
        query("prompt.listByOrganization", () =>
          selectPromptList(db, organizationId)
        ),

      /**
       * Versions and channels reference the internal id, so changing the
       * public handle touches this row only.
       */
      update: (internalId, changes, updatedAt) =>
        query("prompt.update", () =>
          db
            .update(prompt)
            .set({ ...changes, updatedAt })
            .where(eq(prompt.internalId, internalId))
        ).pipe(Effect.asVoid),

      touch: (internalId, updatedAt) =>
        query("prompt.touch", () =>
          db
            .update(prompt)
            .set({ updatedAt })
            .where(eq(prompt.internalId, internalId))
        ).pipe(Effect.asVoid),

      archive: (internalId, archivedAt) =>
        query("prompt.archive", () =>
          db
            .update(prompt)
            .set({ archivedAt })
            .where(eq(prompt.internalId, internalId))
        ).pipe(Effect.asVoid),
    } satisfies PromptRepositoryShape;
  })
);
