import { HttpApiBuilder } from "@effect/platform";
import { CredentialConnections } from "@sphynx/eval/credentials/connections";
import { credentialIntegrations } from "@sphynx/eval/credentials/integrations";
import { Permissions } from "@sphynx/schema/domain/permissions";
import { CurrentActor } from "@sphynx/schema/internal/authentication";
import { PublicApi } from "@sphynx/schema/public/api";
import { Effect } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";
import { withPublicCredentialErrors } from "../../../http/credential-errors";

export const PublicConnectorsHandlers = HttpApiBuilder.group(
  PublicApi,
  "connectors",
  (handlers) =>
    authorized(handlers)
      .handle(
        "integrations",
        { permission: Permissions.Credentials.Read },
        () => Effect.succeed(credentialIntegrations)
      )
      .handle("list", { permission: Permissions.Credentials.Read }, () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;

          return yield* (yield* CredentialConnections).list(actor);
        }).pipe(withPublicCredentialErrors)
      )
      .handle(
        "add",
        { permission: Permissions.Credentials.Write },
        ({ payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;

            return yield* (yield* CredentialConnections).create(actor, payload);
          }).pipe(withPublicCredentialErrors)
      )
      .handle(
        "remove",
        { permission: Permissions.Credentials.Write },
        ({ payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;

            return yield* (yield* CredentialConnections).remove(
              actor,
              payload.id
            );
          }).pipe(withPublicCredentialErrors)
      ).done
);
