import { PromptActivity } from "@anpord/prompts/activity";
import { Permissions } from "@anpord/schema/domain/permissions";
import { PAGE_LIMIT_DEFAULT } from "@anpord/schema/domain/prompts";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";
import { withPromptErrors } from "../../../http/prompt-errors";

export const ActivityHandlers = HttpApiBuilder.group(
  AnpordApi,
  "activity",
  (handlers) =>
    authorized(handlers).handle(
      "list",
      /** The log carries channel moves alongside everything else, so reading it
       * asks for the rights a channel move would. */
      { permission: Permissions.Channels.Read },
      ({ urlParams }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const activity = yield* PromptActivity;

          return yield* activity.list(actor, {
            channel: urlParams.channel,
            cursor: urlParams.cursor,
            kind: urlParams.kind,
            limit: urlParams.limit ?? PAGE_LIMIT_DEFAULT,
            promptId: urlParams.prompt,
          });
        }).pipe(withPromptErrors)
    ).done
);
