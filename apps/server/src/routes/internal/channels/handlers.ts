import { ChannelCatalog } from "@anpord/prompts/channels";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { withPromptErrors } from "../../../http/prompt-errors";

export const ChannelsHandlers = HttpApiBuilder.group(
  AnpordApi,
  "channels",
  (handlers) =>
    handlers
      .handle("list", () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const channels = yield* ChannelCatalog;
          return yield* channels.list(actor);
        }).pipe(withPromptErrors)
      )
      .handle("create", ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const channels = yield* ChannelCatalog;
          return yield* channels.create(actor, payload);
        }).pipe(withPromptErrors)
      )
      .handle("update", ({ path, payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const channels = yield* ChannelCatalog;
          return yield* channels.update(actor, path.name, payload);
        }).pipe(withPromptErrors)
      )
      .handle("remove", ({ path }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const channels = yield* ChannelCatalog;
          return yield* channels.remove(actor, path.name);
        }).pipe(withPromptErrors)
      )
);
