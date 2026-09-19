import { CredentialConnections } from "@anpord/eval/credentials/connections";
import { credentialIntegrations } from "@anpord/eval/credentials/integrations";
import { Permissions } from "@anpord/schema/domain/permissions";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { PublicApi } from "@anpord/schema/public/api";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";
import { handledPublicCredential } from "../../internal/credentials/errors";

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
        }).pipe(handledPublicCredential)
      )
      .handle(
        "add",
        { permission: Permissions.Credentials.Write },
        ({ payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;

            return yield* (yield* CredentialConnections).create(actor, payload);
          }).pipe(handledPublicCredential)
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
          }).pipe(handledPublicCredential)
      ).done
);
