import type { CodebaseError } from "@anpord/eval/codebase/errors";
import { GithubApp } from "@anpord/eval/codebase/github-app";
import { GithubRepositories } from "@anpord/eval/codebase/github-repositories";
import { Installations } from "@anpord/eval/codebase/installations";
import { BadRequest, InternalError } from "@anpord/schema/domain/errors";
import { Permissions } from "@anpord/schema/domain/permissions";
import { AnpordApi } from "@anpord/schema/internal/api";
import { CurrentActor } from "@anpord/schema/internal/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { Effect, Option } from "effect";
import { authorized } from "../../../http/authorization/authorized-group";

const handled = <A, R>(effect: Effect.Effect<A, CodebaseError, R>) =>
  effect.pipe(
    Effect.tapError((error) => Effect.logWarning(error.message)),
    Effect.mapError(
      () => new InternalError({ message: "GitHub is unavailable" })
    )
  );

const unconfigured = new BadRequest({
  message: "No GitHub app is registered for this deployment",
});

export const CodebaseHandlers = HttpApiBuilder.group(
  AnpordApi,
  "codebase",
  (handlers) =>
    authorized(handlers)
      .handle("account", { permission: Permissions.Credentials.Read }, () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const app = yield* GithubApp;
          const installed = yield* (yield* Installations).forOrganization(
            actor
          );

          if (Option.isNone(installed) || app === undefined) {
            return null;
          }

          const { accountLogin, id, repositorySelection } = installed.value;

          return {
            installationId: id,
            login: accountLogin,
            manageUrl: app.manageUrl(id),
            /* Widened at the boundary rather than in the store: the column is
               text, and a row written by an older build is worth showing as
               "selected" rather than failing the page. */
            repositorySelection:
              repositorySelection === "all"
                ? ("all" as const)
                : ("selected" as const),
          };
        }).pipe(handled)
      )
      .handle(
        "repositories",
        { permission: Permissions.Credentials.Read },
        () =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const app = yield* GithubApp;
            const installed = yield* (yield* Installations).forOrganization(
              actor
            );

            /* Nothing installed is an empty list rather than an error: the
               picker shows it as "connect GitHub", which is the truth. */
            if (Option.isNone(installed) || app === undefined) {
              return [];
            }

            const token = yield* app.tokenFor(installed.value.id);

            return yield* (yield* GithubRepositories).list(token);
          }).pipe(handled)
      )
      .handle("installUrl", { permission: Permissions.Credentials.Write }, () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const app = yield* GithubApp;

          if (app === undefined) {
            return yield* Effect.fail(unconfigured);
          }

          /* The organisation travels through GitHub and back, so the callback
             records the installation against the one that asked for it. */
          return { url: app.installUrl(actor.organizationId) };
        })
      )
      .handle(
        "connect",
        { permission: Permissions.Credentials.Write },
        ({ payload }) =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const app = yield* GithubApp;

            if (app === undefined) {
              return yield* Effect.fail(unconfigured);
            }

            /* Read back from GitHub rather than trusted from the query string:
             an installation id in a URL is a number anyone can type, and this
             is what proves the app is really installed on that account. */
            const jwt = yield* handled(app.jwt);
            const found = yield* handled(
              (yield* GithubRepositories).installation(
                jwt,
                payload.installationId
              )
            );

            yield* handled(
              (yield* Installations).record(actor, {
                accountLogin: found.login,
                id: found.id,
                repositorySelection: found.repositorySelection,
              })
            );

            return {
              installationId: found.id,
              login: found.login,
              manageUrl: app.manageUrl(found.id),
              repositorySelection: found.repositorySelection,
            };
          })
      )
      .handle("disconnect", { permission: Permissions.Credentials.Write }, () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          return yield* (yield* Installations).remove(actor);
        }).pipe(handled)
      ).done
);
