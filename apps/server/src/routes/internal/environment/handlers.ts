import { HttpApiBuilder } from "@effect/platform";
import { DeviceAuth } from "@sphynx/eval/credentials/device-auth";
import { Subscriptions } from "@sphynx/eval/credentials/subscriptions";
import { EnvironmentVariables } from "@sphynx/eval/environment/environment-variables";
import { Permissions } from "@sphynx/schema/domain/permissions";
import { SphynxApi } from "@sphynx/schema/internal/api";
import { CurrentActor } from "@sphynx/schema/internal/authentication";
import { Effect } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";
import { withCredentialErrors } from "../../../http/credential-errors";

const read = { permission: Permissions.Credentials.Read };
const write = { permission: Permissions.Credentials.Write };

export const EnvironmentHandlers = HttpApiBuilder.group(
  SphynxApi,
  "environment",
  (handlers) =>
    authorized(handlers)
      .handle("variables", read, () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          return yield* (yield* EnvironmentVariables).list(actor);
        }).pipe(withCredentialErrors)
      )
      .handle("addVariables", write, ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          return yield* (yield* EnvironmentVariables).add(actor, payload);
        }).pipe(withCredentialErrors)
      )
      .handle("updateVariable", write, ({ path, payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          return yield* (yield* EnvironmentVariables).update(
            actor,
            path.id,
            payload
          );
        }).pipe(withCredentialErrors)
      )
      .handle("removeVariable", write, ({ path }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          return yield* (yield* EnvironmentVariables).remove(actor, path.id);
        }).pipe(withCredentialErrors)
      )
      .handle("subscriptions", read, () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          return yield* (yield* Subscriptions).list(actor);
        }).pipe(withCredentialErrors)
      )
      .handle("addSubscription", write, ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          return yield* (yield* Subscriptions).add(actor, payload);
        }).pipe(withCredentialErrors)
      )
      .handle("removeSubscription", write, ({ path }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          return yield* (yield* Subscriptions).remove(actor, path.id);
        }).pipe(withCredentialErrors)
      )
      .handle("startChatGpt", write, ({ payload }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          return yield* (yield* DeviceAuth).start(actor, payload);
        }).pipe(withCredentialErrors)
      )
      .handle("chatGptStatus", write, ({ path }) =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          return yield* (yield* DeviceAuth).status(actor, path.id);
        }).pipe(withCredentialErrors)
      ).done
);
