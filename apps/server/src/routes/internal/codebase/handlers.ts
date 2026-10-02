import { HttpApiBuilder } from "@effect/platform";
import { CodebaseConnection } from "@sphynx/eval/codebase/codebase-connection";
import { Permissions } from "@sphynx/schema/domain/permissions";
import { SphynxApi } from "@sphynx/schema/internal/api";
import { CurrentActor } from "@sphynx/schema/internal/authentication";
import { Effect } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";
import { withCodebaseErrors } from "../../../http/codebase-errors";

const read = { permission: Permissions.Credentials.Read };
const write = { permission: Permissions.Credentials.Write };

export const CodebaseHandlers = HttpApiBuilder.group(
  SphynxApi,
  "codebase",
  (handlers) =>
    authorized(handlers)
      .handle("account", read, () =>
        Effect.gen(function* () {
          return yield* (yield* CodebaseConnection).account(
            yield* CurrentActor
          );
        }).pipe(withCodebaseErrors)
      )
      .handle("repositories", read, () =>
        Effect.gen(function* () {
          return yield* (yield* CodebaseConnection).repositories(
            yield* CurrentActor
          );
        }).pipe(withCodebaseErrors)
      )
      .handle("installUrl", write, () =>
        Effect.gen(function* () {
          return yield* (yield* CodebaseConnection).installUrl(
            yield* CurrentActor
          );
        }).pipe(withCodebaseErrors)
      )
      .handle("connect", write, ({ payload }) =>
        Effect.gen(function* () {
          return yield* (yield* CodebaseConnection).connect(
            yield* CurrentActor,
            payload.installationId
          );
        }).pipe(withCodebaseErrors)
      )
      .handle("disconnect", write, () =>
        Effect.gen(function* () {
          return yield* (yield* CodebaseConnection).disconnect(
            yield* CurrentActor
          );
        }).pipe(withCodebaseErrors)
      ).done
);
