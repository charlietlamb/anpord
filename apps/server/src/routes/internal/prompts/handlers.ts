import { PromptAuthoring } from "@anpord/prompts/authoring";
import { PromptCatalog } from "@anpord/prompts/catalog";
import { PromptPublishing } from "@anpord/prompts/publishing";
import { PromptResolution } from "@anpord/prompts/resolution";
import { Permissions } from "@anpord/schema/domain/permissions";
import { PAGE_LIMIT_DEFAULT } from "@anpord/schema/domain/prompts";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";
import { withPromptErrors } from "../../../http/prompt-errors";

export const PromptsHandlers = HttpApiBuilder.group(
  AnpordApi,
  "prompts",
  (handlers) =>
    authorized(handlers)
      .handle(
        "list",
        { permission: Permissions.Prompts.Read },
        ({ urlParams }) =>
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
      .handle(
        "create",
        { permission: Permissions.Prompts.Write },
        ({ payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const catalog = yield* PromptCatalog;
            return yield* catalog.create(actor, payload);
          }).pipe(withPromptErrors)
      )
      /** Archiving takes a prompt out of every listing the organisation works
       * from, so it sits with the destructive acts rather than with authoring. */
      .handle(
        "archive",
        { permission: Permissions.Organization.Admin },
        ({ path }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const catalog = yield* PromptCatalog;
            return yield* catalog.archive(actor, path.id);
          }).pipe(withPromptErrors)
      )
      .handle(
        "get",
        { permission: Permissions.Prompts.Read },
        ({ path, urlParams }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const resolution = yield* PromptResolution;
            return yield* resolution.get(actor, path.id, urlParams);
          }).pipe(withPromptErrors)
      )
      .handle(
        "addVersion",
        { permission: Permissions.Prompts.Write },
        ({ path, payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const authoring = yield* PromptAuthoring;
            return yield* authoring.addVersion(actor, path.id, payload);
          }).pipe(withPromptErrors)
      )
      /** Rewrites a version in place, which can change what callers already
       * receive, so it asks for publishing rights rather than authoring ones. */
      .handle(
        "updateVersion",
        { permission: Permissions.Channels.Write },
        ({ path, payload }) =>
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
      .handle(
        "listVersions",
        { permission: Permissions.Prompts.Read },
        ({ path }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const authoring = yield* PromptAuthoring;
            return yield* authoring.listVersions(actor, path.id);
          }).pipe(withPromptErrors)
      )
      .handle(
        "listEvents",
        { permission: Permissions.Prompts.Read },
        ({ path }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const authoring = yield* PromptAuthoring;
            return yield* authoring.listEvents(actor, path.id);
          }).pipe(withPromptErrors)
      )
      .handle(
        "update",
        { permission: Permissions.Prompts.Write },
        ({ path, payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const catalog = yield* PromptCatalog;
            return yield* catalog.update(actor, path.id, payload);
          }).pipe(withPromptErrors)
      )
      .handle(
        "listChannels",
        { permission: Permissions.Channels.Read },
        ({ path }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const publishing = yield* PromptPublishing;
            return yield* publishing.listChannels(actor, path.id);
          }).pipe(withPromptErrors)
      )
      .handle(
        "setChannel",
        { permission: Permissions.Channels.Write },
        ({ path, payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const publishing = yield* PromptPublishing;
            return yield* publishing.setChannel(actor, path.id, payload);
          }).pipe(withPromptErrors)
      ).done
);
