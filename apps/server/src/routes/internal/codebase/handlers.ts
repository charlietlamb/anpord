import type { CodebaseError } from "@anpord/eval/codebase/errors";
import { GithubRepositories } from "@anpord/eval/codebase/github-repositories";
import { GithubTokens, REPO_SCOPE } from "@anpord/eval/codebase/github-token";
import { InternalError } from "@anpord/schema/domain/errors";
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

export const CodebaseHandlers = HttpApiBuilder.group(
  AnpordApi,
  "codebase",
  (handlers) =>
    authorized(handlers)
      .handle("account", { permission: Permissions.Credentials.Read }, () =>
        Effect.gen(function* () {
          const actor = yield* CurrentActor;
          const token = yield* (yield* GithubTokens).forActor(actor);

          if (Option.isNone(token)) {
            return null;
          }

          const login = yield* (yield* GithubRepositories).login(token.value);

          return {
            canReadPrivate: token.value.scopes.includes(REPO_SCOPE),
            login,
          };
        }).pipe(handled)
      )
      .handle(
        "repositories",
        { permission: Permissions.Credentials.Read },
        () =>
          Effect.gen(function* () {
            const actor = yield* CurrentActor;
            const token = yield* (yield* GithubTokens).forActor(actor);

            /* Nothing connected is an empty list rather than an error: the
               picker shows it as "connect GitHub", which is the truth. */
            return Option.isNone(token)
              ? []
              : yield* (yield* GithubRepositories).list(token.value);
          }).pipe(handled)
      ).done
);
