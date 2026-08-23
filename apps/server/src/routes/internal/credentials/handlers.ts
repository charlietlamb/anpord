import { CredentialConnections } from "@anpord/eval/credentials/connections";
import { DeviceAuth } from "@anpord/eval/credentials/device-auth";
import type { CredentialError } from "@anpord/eval/credentials/errors";
import { credentialIntegrations } from "@anpord/eval/credentials/integrations";
import {
  BadRequest,
  InternalError,
  NotFound,
} from "@anpord/schema/domain/errors";
import { Permissions } from "@anpord/schema/domain/permissions";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";

const apiError = (error: CredentialError) => {
  if (error.code === "not-found") {
    return new NotFound({ message: error.message });
  }
  if (error.code === "internal") {
    return new InternalError({ message: "Credential operation failed" });
  }
  return new BadRequest({ message: error.message });
};

const handled = <A, R>(effect: Effect.Effect<A, CredentialError, R>) =>
  effect.pipe(Effect.mapError(apiError));

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
      .handle("list", { permission: Permissions.Credentials.Read }, () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          return yield* (yield* CredentialConnections).list(actor);
        }).pipe(handled)
      )
      .handle(
        "create",
        { permission: Permissions.Credentials.Write },
        ({ payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            return yield* (yield* CredentialConnections).create(actor, payload);
          }).pipe(handled)
      )
      .handle(
        "remove",
        { permission: Permissions.Credentials.Write },
        ({ path }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            return yield* (yield* CredentialConnections).remove(actor, path.id);
          }).pipe(handled)
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
          }).pipe(handled)
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
          }).pipe(handled)
      )
      .handle(
        "verify",
        { permission: Permissions.Credentials.Write },
        ({ path }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            return yield* (yield* CredentialConnections).verify(actor, path.id);
          }).pipe(handled)
      )
      .handle(
        "startDevice",
        { permission: Permissions.Credentials.Write },
        ({ payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            return yield* (yield* DeviceAuth).start(actor, payload);
          }).pipe(handled)
      )
      .handle(
        "deviceStatus",
        { permission: Permissions.Credentials.Write },
        ({ path }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            return yield* (yield* DeviceAuth).status(actor, path.id);
          }).pipe(handled)
      ).done
);
