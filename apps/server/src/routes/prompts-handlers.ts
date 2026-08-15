import { PromptAuthoring } from "@anpord/prompts/authoring";
import { PromptCatalog } from "@anpord/prompts/catalog";
import { PromptPublishing } from "@anpord/prompts/publishing";
import { PromptResolution } from "@anpord/prompts/resolution";
import { AnpordApi } from "@anpord/schema/api";
import { CurrentActor } from "@anpord/schema/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { toHttpError } from "../http/prompt-errors";

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
        }).pipe(Effect.catchAll(toHttpError))
      )
      .handle("create", ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const catalog = yield* PromptCatalog;
          return yield* catalog.create(actor, payload);
        }).pipe(Effect.catchAll(toHttpError))
      )
      .handle("archive", ({ path }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const catalog = yield* PromptCatalog;
          return yield* catalog.archive(actor, path.id);
        }).pipe(Effect.catchAll(toHttpError))
      )
      .handle("get", ({ path, urlParams }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const resolution = yield* PromptResolution;
          return yield* resolution.get(actor, path.id, urlParams);
        }).pipe(Effect.catchAll(toHttpError))
      )
      .handle("addVersion", ({ path, payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const authoring = yield* PromptAuthoring;
          return yield* authoring.addVersion(actor, path.id, payload);
        }).pipe(Effect.catchAll(toHttpError))
      )
      .handle("listVersions", ({ path }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const authoring = yield* PromptAuthoring;
          return yield* authoring.listVersions(actor, path.id);
        }).pipe(Effect.catchAll(toHttpError))
      )
      .handle("update", ({ path, payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const catalog = yield* PromptCatalog;
          return yield* catalog.update(actor, path.id, payload);
        }).pipe(Effect.catchAll(toHttpError))
      )
      .handle("setChannel", ({ path, payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const publishing = yield* PromptPublishing;
          return yield* publishing.setChannel(actor, path.id, payload);
        }).pipe(Effect.catchAll(toHttpError))
      )
);
