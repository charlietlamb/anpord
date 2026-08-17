import { ChannelCatalog } from "@anpord/prompts/channels";
import { Permissions } from "@anpord/schema/domain/permissions";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";
import { withPromptErrors } from "../../../http/prompt-errors";

export const ChannelsHandlers = HttpApiBuilder.group(
  AnpordApi,
  "channels",
  (handlers) =>
    authorized(handlers)
      .handle("list", { permission: Permissions.Channels.Read }, () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const channels = yield* ChannelCatalog;
          return yield* channels.list(actor);
        }).pipe(withPromptErrors)
      )
      .handle(
        "create",
        { permission: Permissions.Channels.Write },
        ({ payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const channels = yield* ChannelCatalog;
            return yield* channels.create(actor, payload);
          }).pipe(withPromptErrors)
      )
      .handle(
        "update",
        { permission: Permissions.Channels.Write },
        ({ path, payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const channels = yield* ChannelCatalog;
            return yield* channels.update(actor, path.name, payload);
          }).pipe(withPromptErrors)
      )
      /** A channel is deleted outright rather than archived, so unlike a prompt
       * there is nothing to restore afterwards. */
      .handle(
        "remove",
        { permission: Permissions.Organization.Admin },
        ({ path }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const channels = yield* ChannelCatalog;
            return yield* channels.remove(actor, path.name);
          }).pipe(withPromptErrors)
      ).done
);
