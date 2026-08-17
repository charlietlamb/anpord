import { Deployments } from "@anpord/prompts/deployments";
import { Permissions } from "@anpord/schema/domain/permissions";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { DateTime, Effect } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";

export const DeploymentsHandlers = HttpApiBuilder.group(
  AnpordApi,
  "deployments",
  (handlers) =>
    authorized(handlers).handle(
      "list",
      { permission: Permissions.Prompts.Read },
      ({ urlParams }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const deployments = yield* Deployments;

          return yield* deployments.list(actor, {
            channel: urlParams.channel,
            cursor:
              urlParams.before === undefined
                ? undefined
                : DateTime.toDate(urlParams.before),
            limit: urlParams.limit,
            promptId: urlParams.prompt,
          });
        }).pipe(
          /** A read of an append-only log cannot conflict or miss; a store
           * failure is a defect, the same as every other repository read. */
          Effect.catchTag("PromptStoreError", Effect.die)
        )
    ).done
);
