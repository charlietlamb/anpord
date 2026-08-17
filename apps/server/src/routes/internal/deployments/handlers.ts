import { Deployments } from "@anpord/prompts/deployments";
import { Permissions } from "@anpord/schema/domain/permissions";
import { PAGE_LIMIT_DEFAULT } from "@anpord/schema/domain/prompts";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";
import { withPromptErrors } from "../../../http/prompt-errors";

export const DeploymentsHandlers = HttpApiBuilder.group(
  AnpordApi,
  "deployments",
  (handlers) =>
    authorized(handlers).handle(
      "list",
      /** A deployment is a channel event, so reading one is reading a channel
       * rather than reading a prompt. */
      { permission: Permissions.Channels.Read },
      ({ urlParams }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const deployments = yield* Deployments;

          return yield* deployments.list(actor, {
            channel: urlParams.channel,
            cursor: urlParams.cursor,
            limit: urlParams.limit ?? PAGE_LIMIT_DEFAULT,
            promptId: urlParams.prompt,
          });
        }).pipe(withPromptErrors)
    ).done
);
