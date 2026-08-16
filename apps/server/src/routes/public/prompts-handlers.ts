import { PromptAuthoring } from "@anpord/prompts/authoring";
import { PromptCatalog } from "@anpord/prompts/catalog";
import { PromptPublishing } from "@anpord/prompts/publishing";
import { PromptResolution } from "@anpord/prompts/resolution";
import { CurrentActor } from "@anpord/schema/authentication";
import { PublicApi } from "@anpord/schema/public/api";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { withPromptErrors } from "../../http/prompt-errors";
import { fromPublicCreate, fromPublicUpdate } from "./from-public";
import { answeringChannel, selectorFor } from "./selector";
import { toPublicPrompt, toPublicSummary, toPublicVersion } from "./to-public";

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

          const prompt = yield* resolution.get(
            actor,
            payload.id,
            selectorFor(payload)
          );
          const publicPrompt = {
            ...toPublicPrompt(prompt),
            channel: answeringChannel(payload),
          };

          if (!payload.includeVersions) {
            return publicPrompt;
          }

          const history = yield* authoring.listVersions(actor, payload.id);
          return { ...publicPrompt, versions: history.map(toPublicVersion) };
        }).pipe(withPromptErrors)
      )
      .handle("list", () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const catalog = yield* PromptCatalog;
          const rows = yield* catalog.list(actor);
          return { data: rows.map(toPublicSummary) };
        }).pipe(withPromptErrors)
      )
      .handle("create", ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const catalog = yield* PromptCatalog;
          const created = yield* catalog.create(
            actor,
            fromPublicCreate(payload)
          );
          return toPublicPrompt(created);
        }).pipe(withPromptErrors)
      )
      .handle("update", ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const authoring = yield* PromptAuthoring;
          const version = yield* authoring.addVersion(
            actor,
            payload.id,
            fromPublicUpdate(payload)
          );
          return toPublicPrompt(version);
        }).pipe(withPromptErrors)
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
        }).pipe(withPromptErrors)
      )
      .handle("archive", ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const catalog = yield* PromptCatalog;
          yield* catalog.archive(actor, payload.id);
          return OK;
        }).pipe(withPromptErrors)
      )
);
