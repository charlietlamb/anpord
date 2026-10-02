import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Database } from "@sphynx/db/client";
import { oauthApplication } from "@sphynx/db/schema/auth/oauth";
import { skipWithoutDatabase, testDatabase } from "@sphynx/db/test-database";
import { eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { OAuthClients, OAuthClientsLive } from "../../src/oauth/oauth-clients";

const clientId = `client_oauth_clients_${Date.now()}`;
const database = testDatabase({ poolMax: 2 });
const TestLayer = OAuthClientsLive.pipe(Layer.provideMerge(database));

const run = <A, E>(effect: Effect.Effect<A, E, OAuthClients | Database>) =>
  Effect.runPromise(Effect.provide(effect, TestLayer));

describe.skipIf(skipWithoutDatabase())("OAuthClients.name", () => {
  beforeAll(() =>
    run(
      Effect.flatMap(Database, (db) =>
        Effect.promise(() =>
          db.insert(oauthApplication).values({
            clientId,
            id: clientId,
            name: "Claude",
            redirectUrls: "https://claude.ai/callback",
            type: "public",
          })
        )
      )
    )
  );

  afterAll(() =>
    run(
      Effect.flatMap(Database, (db) =>
        Effect.promise(() =>
          db
            .delete(oauthApplication)
            .where(eq(oauthApplication.clientId, clientId))
        )
      )
    )
  );

  test("returns the registered name of a client", async () => {
    const name = await run(
      Effect.flatMap(OAuthClients, (clients) => clients.name(clientId))
    );

    expect(name).toBe("Claude");
  });

  test("fails with OAuthClientNotFound for an unknown client", async () => {
    const error = await run(
      Effect.flip(
        Effect.flatMap(OAuthClients, (clients) => clients.name("missing"))
      )
    );

    expect(error._tag).toBe("OAuthClientNotFound");
  });
});
