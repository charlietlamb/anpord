import { HttpApiBuilder } from "@effect/platform";
import { PromptActivity } from "@sphynx/prompts/activity";
import { Permissions } from "@sphynx/schema/domain/permissions";
import { PAGE_LIMIT_DEFAULT } from "@sphynx/schema/domain/prompts";
import { SphynxApi } from "@sphynx/schema/internal/api";
import { CurrentActor } from "@sphynx/schema/internal/authentication";
import { Effect } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";
import { withPromptErrors } from "../../../http/prompt-errors";

export const ActivityHandlers = HttpApiBuilder.group(
  SphynxApi,
  "activity",
  (handlers) =>
    authorized(handlers).handle(
      "list",
      /* The log carries channel moves, so reading it asks for the rights a channel move would. */
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
