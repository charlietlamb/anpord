import { PromptAuthoring } from "@anpord/prompts/authoring";
import { PromptCatalog } from "@anpord/prompts/catalog";
import { PromptPublishing } from "@anpord/prompts/publishing";
import { PromptResolution } from "@anpord/prompts/resolution";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { withPromptErrors } from "../../../http/prompt-errors";

export const PromptsHandlers = HttpApiBuilder.group(
  AnpordApi,
  "prompts",
  (handlers) =>
    handlers
      .handle("list", () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const catalog = yield* PromptCatalog;
          return yield* catalog.list(actor);
        }).pipe(withPromptErrors)
      )
      .handle("create", ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const catalog = yield* PromptCatalog;
          return yield* catalog.create(actor, payload);
        }).pipe(withPromptErrors)
      )
      .handle("archive", ({ path }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const catalog = yield* PromptCatalog;
          return yield* catalog.archive(actor, path.id);
        }).pipe(withPromptErrors)
      )
      .handle("get", ({ path, urlParams }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const resolution = yield* PromptResolution;
          return yield* resolution.get(actor, path.id, urlParams);
        }).pipe(withPromptErrors)
      )
      .handle("addVersion", ({ path, payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const authoring = yield* PromptAuthoring;
          return yield* authoring.addVersion(actor, path.id, payload);
        }).pipe(withPromptErrors)
      )
      .handle("listVersions", ({ path }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const authoring = yield* PromptAuthoring;
          return yield* authoring.listVersions(actor, path.id);
        }).pipe(withPromptErrors)
      )
      .handle("update", ({ path, payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const catalog = yield* PromptCatalog;
          return yield* catalog.update(actor, path.id, payload);
        }).pipe(withPromptErrors)
      )
      .handle("listChannels", ({ path }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const publishing = yield* PromptPublishing;
          return yield* publishing.listChannels(actor, path.id);
        }).pipe(withPromptErrors)
      )
      .handle("setChannel", ({ path, payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const publishing = yield* PromptPublishing;
          return yield* publishing.setChannel(actor, path.id, payload);
        }).pipe(withPromptErrors)
      )
);
