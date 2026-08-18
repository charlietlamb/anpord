import { IdGenerator } from "@anpord/ids/id";
import type { Actor } from "@anpord/schema/domain/actor";
import type {
  CreatePromptRequest,
  PromptId,
  PromptPage,
  PromptSortOrder,
  PromptStatusFilter,
  ResolvedPrompt,
  UpdatePromptRequest,
} from "@anpord/schema/domain/prompts";
import { Clock, Context, Effect, Layer } from "effect";
import type { PromptError } from "../domain/errors";
import { PromptIdTaken } from "../domain/errors";
import {
  cursorFor,
  decodePromptCursor,
  encodePromptCursor,
} from "../domain/prompt-cursor";
import { toSummary } from "../domain/views";
import { PromptRepository } from "../repositories/prompt-repository";
import { PromptVersionRepository } from "../repositories/prompt-version-repository";
import { createPrompt } from "./create-prompt";
import { PromptCache } from "./prompt-cache";
import { PromptPublishing } from "./prompt-publishing";
import { requirePrompt } from "./require-prompt";

export interface PromptListQuery {
  readonly cursor?: string;
  readonly limit: number;
  readonly search?: string;
  readonly sort?: PromptSortOrder;
  readonly status?: PromptStatusFilter;
}

export interface PromptCatalogShape {
  readonly archive: (
    actor: Actor,
    id: PromptId
  ) => Effect.Effect<void, PromptError>;
  readonly create: (
    actor: Actor,
    request: CreatePromptRequest
  ) => Effect.Effect<ResolvedPrompt, PromptError>;
  readonly list: (
    actor: Actor,
    query: PromptListQuery
  ) => Effect.Effect<PromptPage, PromptError>;
  readonly update: (
    actor: Actor,
    id: PromptId,
    request: UpdatePromptRequest
  ) => Effect.Effect<void, PromptError>;
}

export class PromptCatalog extends Context.Tag("@anpord/prompts/PromptCatalog")<
  PromptCatalog,
  PromptCatalogShape
>() {}

export const PromptCatalogLive = Layer.effect(
  PromptCatalog,
  Effect.gen(function* () {
    const prompts = yield* PromptRepository;
    const versions = yield* PromptVersionRepository;
    const publishing = yield* PromptPublishing;
    const promptCache = yield* PromptCache;
    const ids = yield* IdGenerator;

    const requireIdFree = (actor: Actor, id: PromptId) =>
      Effect.gen(function* () {
        const taken = yield* prompts.idExists(actor.organizationId, id);

        if (taken) {
          return yield* Effect.fail(new PromptIdTaken({ id }));
        }
      });

    return {
      create: (actor, request) =>
        Effect.gen(function* () {
          yield* requireIdFree(actor, request.id);
          return yield* createPrompt(
            { ids, prompts, publishing, versions },
            actor,
            request
          );
        }).pipe(
          Effect.withSpan("PromptCatalog.create"),
          Effect.annotateLogs({
            orgId: actor.organizationId,
            promptId: request.id,
          })
        ),

      list: (actor, query) =>
        Effect.gen(function* () {
          const sort = query.sort ?? "updated";
          const cursor =
            query.cursor === undefined
              ? undefined
              : yield* decodePromptCursor(query.cursor, sort);

          const rows = yield* prompts.listByOrganization(actor.organizationId, {
            cursor,
            limit: query.limit,
            search: query.search,
            sort,
            status: query.status,
          });

          const page = rows.slice(0, query.limit);
          const last = page.at(-1);

          return {
            items: yield* Effect.all(page.map(toSummary)),
            nextCursor:
              rows.length > query.limit && last !== undefined
                ? encodePromptCursor(cursorFor(last, sort))
                : null,
          } satisfies PromptPage;
        }).pipe(
          Effect.withSpan("PromptCatalog.list"),
          Effect.annotateLogs({ orgId: actor.organizationId })
        ),

      update: (actor, id, request) =>
        Effect.gen(function* () {
          const row = yield* requirePrompt(prompts, actor, id);

          if (request.id !== undefined && request.id !== id) {
            yield* requireIdFree(actor, request.id);
          }

          const updatedAt = new Date(yield* Clock.currentTimeMillis);
          yield* prompts.update(row.internalId, request, updatedAt);

          yield* promptCache.invalidate(
            actor.organizationId,
            id,
            request.id ?? id
          );

          yield* Effect.logInfo("prompt updated");
        }).pipe(
          Effect.withSpan("PromptCatalog.update"),
          Effect.annotateLogs({ orgId: actor.organizationId, promptId: id })
        ),

      archive: (actor, id) =>
        Effect.gen(function* () {
          const row = yield* requirePrompt(prompts, actor, id);
          const archivedAt = new Date(yield* Clock.currentTimeMillis);

          yield* prompts.archive(row.internalId, archivedAt);
          yield* promptCache.invalidate(actor.organizationId, id);
          yield* Effect.logInfo("prompt archived");
        }).pipe(
          Effect.withSpan("PromptCatalog.archive"),
          Effect.annotateLogs({ orgId: actor.organizationId, promptId: id })
        ),
    } satisfies PromptCatalogShape;
  })
);
