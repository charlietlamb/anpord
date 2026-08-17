import { ChannelCatalog } from "@anpord/prompts/channels";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { CHANNEL_PERMISSIONS } from "@anpord/schema/internal/channels-permissions";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { guardBy } from "../../../http/authorization/guard";
import { withPromptErrors } from "../../../http/prompt-errors";

const guard = guardBy(CHANNEL_PERMISSIONS);

export const ChannelsHandlers = HttpApiBuilder.group(
  AnpordApi,
  "channels",
  (handlers) =>
    handlers
      .handle("list", () =>
        guard(
          "list",
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const channels = yield* ChannelCatalog;
            return yield* channels.list(actor);
          }).pipe(withPromptErrors)
        )
      )
      .handle("create", ({ payload }) =>
        guard(
          "create",
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const channels = yield* ChannelCatalog;
            return yield* channels.create(actor, payload);
          }).pipe(withPromptErrors)
        )
      )
      .handle("update", ({ path, payload }) =>
        guard(
          "update",
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const channels = yield* ChannelCatalog;
            return yield* channels.update(actor, path.name, payload);
          }).pipe(withPromptErrors)
        )
      )
      .handle("remove", ({ path }) =>
        guard(
          "remove",
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const channels = yield* ChannelCatalog;
            return yield* channels.remove(actor, path.name);
          }).pipe(withPromptErrors)
        )
      )
);
