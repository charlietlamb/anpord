import { Database } from "@anpord/db/client";
import { oauthApplication } from "@anpord/db/schema/auth/oauth";
import { eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import { OAuthClientNotFound, OAuthClientUnreadable } from "./errors";

export interface OAuthClientsShape {
  readonly name: (
    clientId: string
  ) => Effect.Effect<string, OAuthClientNotFound | OAuthClientUnreadable>;
}

export class OAuthClients extends Context.Tag("@anpord/auth/OAuthClients")<
  OAuthClients,
  OAuthClientsShape
>() {}

export const OAuthClientsLive = Layer.effect(
  OAuthClients,
  Effect.gen(function* () {
    const db = yield* Database;

    const name = (clientId: string) =>
      Effect.gen(function* () {
        const [client] = yield* Effect.tryPromise({
          catch: (cause) => new OAuthClientUnreadable({ cause }),
          try: () =>
            db
              .select({ name: oauthApplication.name })
              .from(oauthApplication)
              .where(eq(oauthApplication.clientId, clientId))
              .limit(1),
        });

        if (client === undefined) {
          return yield* new OAuthClientNotFound({ clientId });
        }

        return client.name;
      }).pipe(
        Effect.withSpan("OAuthClients.name", { attributes: { clientId } })
      );

    return { name };
  })
);
