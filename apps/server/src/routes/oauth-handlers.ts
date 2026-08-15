import { findOAuthClientName } from "@anpord/auth/oauth-clients";
import { Database } from "@anpord/db/client";
import { AnpordApi } from "@anpord/schema/api";
import { NotFound } from "@anpord/schema/errors";
import { HttpApiBuilder } from "@effect/platform";
import { Effect, Option } from "effect";

/**
 * Unauthenticated on purpose: the consent screen renders before the user has
 * agreed to anything, and a client's display name is what its registration
 * already made public.
 */
export const OAuthHandlers = HttpApiBuilder.group(
  AnpordApi,
  "oauth",
  (handlers) =>
    handlers.handle("client", ({ path }) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const name = yield* Effect.promise(() =>
          findOAuthClientName(db, path.clientId)
        );

        return yield* Option.match(Option.fromNullable(name), {
          onNone: () =>
            Effect.fail(new NotFound({ message: "No such client" })),
          onSome: (resolved) => Effect.succeed({ name: resolved }),
        });
      })
    )
);
