import { PromptAuthoring } from "@anpord/prompts/authoring";
import { PromptCatalog } from "@anpord/prompts/catalog";
import { PromptPublishing } from "@anpord/prompts/publishing";
import { PromptResolution } from "@anpord/prompts/resolution";
import { PAGE_LIMIT_DEFAULT } from "@anpord/schema/domain/prompts";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { PROMPT_PERMISSIONS } from "@anpord/schema/internal/prompts-permissions";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { guardBy } from "../../../http/authorization/guard";
import { withPromptErrors } from "../../../http/prompt-errors";

const guard = guardBy(PROMPT_PERMISSIONS);

export const PromptsHandlers = HttpApiBuilder.group(
  AnpordApi,
  "prompts",
  (handlers) =>
    handlers
      .handle("list", ({ urlParams }) =>
        guard(
          "list",
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const catalog = yield* PromptCatalog;
            return yield* catalog.list(actor, {
              cursor: urlParams.cursor,
              limit: urlParams.limit ?? PAGE_LIMIT_DEFAULT,
              search: urlParams.q,
              sort: urlParams.sort,
              status: urlParams.status,
            });
          }).pipe(withPromptErrors)
        )
      )
      .handle("create", ({ payload }) =>
        guard(
          "create",
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const catalog = yield* PromptCatalog;
            return yield* catalog.create(actor, payload);
          }).pipe(withPromptErrors)
        )
      )
      .handle("archive", ({ path }) =>
        guard(
          "archive",
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const catalog = yield* PromptCatalog;
            return yield* catalog.archive(actor, path.id);
          }).pipe(withPromptErrors)
        )
      )
      .handle("get", ({ path, urlParams }) =>
        guard(
          "get",
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const resolution = yield* PromptResolution;
            return yield* resolution.get(actor, path.id, urlParams);
          }).pipe(withPromptErrors)
        )
      )
      .handle("addVersion", ({ path, payload }) =>
        guard(
          "addVersion",
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const authoring = yield* PromptAuthoring;
            return yield* authoring.addVersion(actor, path.id, payload);
          }).pipe(withPromptErrors)
        )
      )
      .handle("updateVersion", ({ path, payload }) =>
        guard(
          "updateVersion",
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const authoring = yield* PromptAuthoring;
            return yield* authoring.updateVersion(
              actor,
              path.id,
              path.version,
              payload
            );
          }).pipe(withPromptErrors)
        )
      )
      .handle("listVersions", ({ path }) =>
        guard(
          "listVersions",
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const authoring = yield* PromptAuthoring;
            return yield* authoring.listVersions(actor, path.id);
          }).pipe(withPromptErrors)
        )
      )
      .handle("update", ({ path, payload }) =>
        guard(
          "update",
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const catalog = yield* PromptCatalog;
            return yield* catalog.update(actor, path.id, payload);
          }).pipe(withPromptErrors)
        )
      )
      .handle("listChannels", ({ path }) =>
        guard(
          "listChannels",
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const publishing = yield* PromptPublishing;
            return yield* publishing.listChannels(actor, path.id);
          }).pipe(withPromptErrors)
        )
      )
      .handle("setChannel", ({ path, payload }) =>
        guard(
          "setChannel",
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const publishing = yield* PromptPublishing;
            return yield* publishing.setChannel(actor, path.id, payload);
          }).pipe(withPromptErrors)
        )
      )
);
