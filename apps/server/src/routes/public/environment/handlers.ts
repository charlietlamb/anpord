import { HttpApiBuilder } from "@effect/platform";
import { CredentialError } from "@sphynx/eval/credentials/errors";
import { Subscriptions } from "@sphynx/eval/credentials/subscriptions";
import { EnvironmentVariables } from "@sphynx/eval/environment/environment-variables";
import { Permissions } from "@sphynx/schema/domain/permissions";
import { CurrentActor } from "@sphynx/schema/internal/authentication";
import { PublicApi } from "@sphynx/schema/public/api";
import { Effect } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";
import { withPublicCredentialErrors } from "../../../http/credential-errors";

export const PublicEnvironmentHandlers = HttpApiBuilder.group(
  PublicApi,
  "environment",
  (handlers) =>
    authorized(handlers)
      .handle("list", { permission: Permissions.Credentials.Read }, () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const [variables, subscriptions] = yield* Effect.all([
            (yield* EnvironmentVariables).list(actor),
            (yield* Subscriptions).list(actor),
          ]);
          return { subscriptions, variables };
        }).pipe(withPublicCredentialErrors)
      )
      .handle(
        "set",
        { permission: Permissions.Credentials.Write },
        ({ payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            return yield* (yield* EnvironmentVariables).add(actor, payload);
          }).pipe(withPublicCredentialErrors)
      )
      .handle(
        "remove",
        { permission: Permissions.Credentials.Write },
        ({ payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const variables = yield* EnvironmentVariables;
            const found = (yield* variables.list(actor)).find(
              (variable) =>
                variable.name === payload.name &&
                variable.scope === payload.scope
            );
            if (found === undefined) {
              return yield* new CredentialError({
                code: "not-found",
                message: `${payload.name} is not set`,
              });
            }
            return yield* variables.remove(actor, found.id);
          }).pipe(withPublicCredentialErrors)
      ).done
);
