import { Placements } from "@anpord/prompts/placements";
import { Permissions } from "@anpord/schema/domain/permissions";
import { PAGE_LIMIT_DEFAULT } from "@anpord/schema/domain/prompts";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";
import { withPromptErrors } from "../../../http/prompt-errors";

export const PlacementsHandlers = HttpApiBuilder.group(
  AnpordApi,
  "placements",
  (handlers) =>
    authorized(handlers)
      .handle(
        "list",
        { permission: Permissions.Prompts.Read },
        ({ urlParams }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const placements = yield* Placements;

            return yield* placements.list(actor, {
              cursor: urlParams.cursor,
              limit: urlParams.limit ?? PAGE_LIMIT_DEFAULT,
              search: urlParams.q,
            });
          }).pipe(withPromptErrors)
      )
      .handle(
        "apply",
        /** Moving a channel is publishing, so a batch needs the same write
         * permission a single move does. */
        { permission: Permissions.Prompts.Write },
        ({ payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const placements = yield* Placements;

            return yield* placements.apply(actor, payload);
          }).pipe(withPromptErrors)
      ).done
);
