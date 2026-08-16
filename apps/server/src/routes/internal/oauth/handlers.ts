import { findOAuthClientName } from "@anpord/auth/oauth/client-lookup";
import { Database } from "@anpord/db/client";
import { InternalError, NotFound } from "@anpord/schema/domain/errors";
import { AnpordApi } from "@anpord/schema/internal/api";
import { HttpApiBuilder } from "@effect/platform";
import { Effect, Option } from "effect";

export const OAuthHandlers = HttpApiBuilder.group(
  AnpordApi,
  "oauth",
  (handlers) =>
    handlers.handle("client", ({ path }) =>
      Effect.gen(function* () {
        const db = yield* Database;
        const name = yield* Effect.tryPromise({
          catch: () =>
            new InternalError({ message: "Could not read the client" }),
          try: () => findOAuthClientName(db, path.clientId),
        });

        return yield* Option.match(Option.fromNullable(name), {
          onNone: () =>
            Effect.fail(new NotFound({ message: "No such client" })),
          onSome: (resolved) => Effect.succeed({ name: resolved }),
        });
      })
    )
);
