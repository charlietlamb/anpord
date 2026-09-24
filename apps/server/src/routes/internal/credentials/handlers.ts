import { CredentialConnections } from "@anpord/eval/credentials/connections";
import { DeviceAuth } from "@anpord/eval/credentials/device-auth";
import { credentialIntegrations } from "@anpord/eval/credentials/integrations";
import { Permissions } from "@anpord/schema/domain/permissions";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";
import { handledCredential } from "../../../http/credential-errors";

export const CredentialsHandlers = HttpApiBuilder.group(
  AnpordApi,
  "credentials",
  (handlers) =>
    authorized(handlers)
      .handle(
        "integrations",
        { permission: Permissions.Credentials.Read },
        () => Effect.succeed(credentialIntegrations)
      )
      .handle("awareness", { permission: Permissions.Credentials.Read }, () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          return yield* (yield* CredentialConnections).awareness(actor);
        }).pipe(handledCredential)
      )
      .handle("list", { permission: Permissions.Credentials.Read }, () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          return yield* (yield* CredentialConnections).list(actor);
        }).pipe(handledCredential)
      )
      .handle(
        "create",
        { permission: Permissions.Credentials.Write },
        ({ payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            return yield* (yield* CredentialConnections).create(actor, payload);
          }).pipe(handledCredential)
      )
      .handle(
        "remove",
        { permission: Permissions.Credentials.Write },
        ({ path }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            return yield* (yield* CredentialConnections).remove(actor, path.id);
          }).pipe(handledCredential)
      )
      .handle(
        "setDefault",
        { permission: Permissions.Credentials.Write },
        ({ path }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            return yield* (yield* CredentialConnections).setDefault(
              actor,
              path.id
            );
          }).pipe(handledCredential)
      )
      .handle(
        "rotate",
        { permission: Permissions.Credentials.Write },
        ({ path, payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            return yield* (yield* CredentialConnections).rotate(
              actor,
              path.id,
              payload.values
            );
          }).pipe(handledCredential)
      )
      .handle(
        "verify",
        { permission: Permissions.Credentials.Write },
        ({ path }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            return yield* (yield* CredentialConnections).verify(actor, path.id);
          }).pipe(handledCredential)
      )
      .handle(
        "startDevice",
        { permission: Permissions.Credentials.Write },
        ({ payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            return yield* (yield* DeviceAuth).start(actor, payload);
          }).pipe(handledCredential)
      )
      .handle(
        "deviceStatus",
        { permission: Permissions.Credentials.Write },
        ({ path }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            return yield* (yield* DeviceAuth).status(actor, path.id);
          }).pipe(handledCredential)
      ).done
);
