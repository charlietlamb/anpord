import { PromptAuthoring } from "@anpord/prompts/authoring";
import { PromptCatalog } from "@anpord/prompts/catalog";
import { PromptPublishing } from "@anpord/prompts/publishing";
import { PromptResolution } from "@anpord/prompts/resolution";
import { CurrentActor } from "@anpord/schema/authentication";
import { PRODUCTION } from "@anpord/schema/prompts";
import { PublicApi } from "@anpord/schema/public/api";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { toHttpError } from "../../http/prompt-errors";
import { toPublicPrompt, toPublicSummary } from "./to-public";

const OK = { ok: true } as const;

export const PublicPromptsHandlers = HttpApiBuilder.group(
  PublicApi,
  "prompts",
  (handlers) =>
    handlers
      .handle("get", ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const resolution = yield* PromptResolution;
          const authoring = yield* PromptAuthoring;

          const selector = payload.version
            ? { version: payload.version }
            : { channel: payload.channel };
          const prompt = yield* resolution.get(actor, payload.id, selector);

          /** Say which channel answered, so an omitted selector is not a silent default. */
          const channel = payload.version
            ? null
            : (payload.channel ?? PRODUCTION);
          const publicPrompt = { ...toPublicPrompt(prompt), channel };

          if (!payload.includeVersions) {
            return publicPrompt;
          }

          const history = yield* authoring.listVersions(actor, payload.id);
          return {
            ...publicPrompt,
            versions: history.map((row) => ({
              createdAt: toPublicPrompt(row).createdAt,
              message: row.commitMessage,
              version: row.version,
            })),
          };
        }).pipe(Effect.catchAll(toHttpError))
      )
      .handle("list", () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const catalog = yield* PromptCatalog;
          const rows = yield* catalog.list(actor);
          return { data: rows.map(toPublicSummary) };
        }).pipe(Effect.catchAll(toHttpError))
      )
      .handle("create", ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const catalog = yield* PromptCatalog;
          const created = yield* catalog.create(actor, {
            commitMessage: payload.message,
            config: payload.config,
            content: payload.content,
            description: payload.description,
            id: payload.id,
            name: payload.name,
          });
          return toPublicPrompt(created);
        }).pipe(Effect.catchAll(toHttpError))
      )
      .handle("update", ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const authoring = yield* PromptAuthoring;
          const version = yield* authoring.addVersion(actor, payload.id, {
            commitMessage: payload.message,
            config: payload.config,
            content: payload.content,
          });
          return toPublicPrompt(version);
        }).pipe(Effect.catchAll(toHttpError))
      )
      .handle("promote", ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const publishing = yield* PromptPublishing;
          yield* publishing.setChannel(actor, payload.id, {
            channel: payload.channel,
            version: payload.version,
          });
          return OK;
        }).pipe(Effect.catchAll(toHttpError))
      )
      .handle("archive", ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const catalog = yield* PromptCatalog;
          yield* catalog.archive(actor, payload.id);
          return OK;
        }).pipe(Effect.catchAll(toHttpError))
      )
);
