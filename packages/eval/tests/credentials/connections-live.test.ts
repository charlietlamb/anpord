import { beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { user } from "@anpord/db/schema/auth/users";
import { credentialAuthAttempt } from "@anpord/db/schema/credentials/auth-attempts";
import { IdGeneratorLive } from "@anpord/ids/layer";
import { Actor, OrganizationId, UserId } from "@anpord/schema/domain/actor";
import {
  Clock,
  ConfigProvider,
  Duration,
  Effect,
  Layer,
  Redacted,
} from "effect";
import {
  CredentialCipher,
  CredentialCipherLive,
} from "../../src/credentials/cipher";
import {
  CredentialConnections,
  CredentialConnectionsLive,
  CredentialResolver,
  CredentialResolverLive,
} from "../../src/credentials/connections";
import { DeviceAuth, DeviceAuthLive } from "../../src/credentials/device-auth";
import { skipWithoutDatabase } from "../fixtures/database";

const url = process.env.EVAL_TEST_DATABASE_URL;
const database = DatabaseLive.pipe(
  Layer.provide(
    Layer.succeed(DatabaseConfig, {
      poolMax: 2,
      statementTimeout: Duration.seconds(10),
      url: Redacted.make(url ?? ""),
    })
  )
);
const dependencies = Layer.mergeAll(
  database,
  IdGeneratorLive,
  CredentialCipherLive
);
const TestLayer = Layer.mergeAll(
  CredentialCipherLive,
  CredentialConnectionsLive.pipe(Layer.provide(dependencies)),
  CredentialResolverLive.pipe(Layer.provide(dependencies)),
  DeviceAuthLive.pipe(
    Layer.provide(CredentialConnectionsLive.pipe(Layer.provide(dependencies))),
    Layer.provide(dependencies)
  ),
  database
);
const suffix = Date.now();
const organizationId = `org_credentials_${suffix}`;
const userId = `user_credentials_${suffix}`;
const otherUserId = `user_credentials_other_${suffix}`;
const actor = Actor.make({
  id: UserId.make(userId),
  isUser: true,
  organizationId: OrganizationId.make(organizationId),
  permissions: [],
});
const otherActor = Actor.make({
  id: UserId.make(otherUserId),
  isUser: true,
  organizationId: OrganizationId.make(organizationId),
  permissions: [],
});

const run = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    | CredentialCipher
    | CredentialConnections
    | CredentialResolver
    | Database
    | DeviceAuth
  >
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(TestLayer),
      Effect.withConfigProvider(
        ConfigProvider.fromMap(
          new Map([["CREDENTIALS_ENCRYPTION_KEY", "live-test-key"]])
        )
      ),
      Effect.scoped
    ) as Effect.Effect<A, E>
  );

describe.skipIf(skipWithoutDatabase())("credential connections", () => {
  beforeAll(() =>
    run(
      Effect.gen(function* () {
        const db = yield* Database;
        const now = new Date();
        yield* Effect.promise(() =>
          db.insert(organization).values({
            createdAt: now,
            id: organizationId,
            name: "Credentials test",
            slug: `credentials-${suffix}`,
          })
        );
        yield* Effect.promise(() =>
          db.insert(user).values([
            {
              createdAt: now,
              email: `credentials-${suffix}@example.com`,
              emailVerified: true,
              id: userId,
              name: "Credentials test",
              updatedAt: now,
            },
            {
              createdAt: now,
              email: `credentials-other-${suffix}@example.com`,
              emailVerified: true,
              id: otherUserId,
              name: "Other credentials test",
              updatedAt: now,
            },
          ])
        );
      })
    )
  );

  it("stores, lists, defaults, and resolves a sealed connection", async () => {
    const result = await run(
      Effect.gen(function* () {
        const connections = yield* CredentialConnections;
        const resolver = yield* CredentialResolver;
        const created = yield* connections.create(actor, {
          authMethodId: "api-key",
          integrationId: "daytona",
          isDefault: false,
          name: "Primary",
          scope: "organization",
          values: { apiKey: "daytona-secret" },
        });
        const checked = yield* connections.verify(actor, created.id);
        yield* connections.rotate(actor, created.id, {
          apiKey: "daytona-secret-rotated",
        });
        const listed = yield* connections.list(actor);
        const resolved = yield* resolver.resolve({
          actor,
          integrationId: "daytona",
        });
        return { checked, listed, resolved: Redacted.value(resolved) };
      })
    );

    expect(result.listed).toHaveLength(1);
    expect(result.listed[0]?.isDefault).toBe(true);
    expect(result.checked.lastVerifiedAt).not.toBeNull();
    expect(result.resolved.revision).toBe(2);
    expect(result.resolved.values).toEqual({
      apiKey: "daytona-secret-rotated",
    });
    expect(JSON.stringify(result.listed)).not.toContain("daytona-secret");
  });

  it("prefers a personal default without exposing it to another user", async () => {
    const result = await run(
      Effect.gen(function* () {
        const connections = yield* CredentialConnections;
        const resolver = yield* CredentialResolver;
        const personal = yield* connections.create(actor, {
          authMethodId: "api-key",
          integrationId: "daytona",
          isDefault: true,
          name: "Personal",
          scope: "personal",
          values: { apiKey: "personal-secret" },
        });
        yield* connections.create(otherActor, {
          authMethodId: "api-key",
          integrationId: "daytona",
          isDefault: true,
          name: "Personal",
          scope: "personal",
          values: { apiKey: "other-personal-secret" },
        });
        const mine = yield* resolver.resolve({
          actor,
          integrationId: "daytona",
        });
        const theirs = yield* resolver.resolve({
          actor: otherActor,
          integrationId: "daytona",
        });
        const forbidden = yield* Effect.either(
          resolver.resolve({
            actor: otherActor,
            connectionId: personal.id,
            integrationId: "daytona",
          })
        );
        return {
          forbidden,
          mine: Redacted.value(mine).values,
          theirs: Redacted.value(theirs).values,
        };
      })
    );

    expect(result.mine).toEqual({ apiKey: "personal-secret" });
    expect(result.theirs).toEqual({ apiKey: "other-personal-secret" });
    expect(result.forbidden._tag).toBe("Left");
  });

  it("expires device attempts using the Effect clock", async () => {
    const status = await run(
      Effect.gen(function* () {
        const cipher = yield* CredentialCipher;
        const db = yield* Database;
        const device = yield* DeviceAuth;
        const id = `credentialAuthAttempt_${suffix}`;
        const now = yield* Clock.currentTimeMillis;
        const sealedState = yield* cipher.seal(
          Redacted.make(JSON.stringify({ connectionId: null })),
          `${organizationId}\0${id}\0codex-device`
        );
        yield* Effect.promise(() =>
          db.insert(credentialAuthAttempt).values({
            authMethodId: "chatgpt",
            expiresAt: new Date(now - 1),
            id,
            integrationId: "codex",
            organizationId,
            sealedState,
            status: "pending",
            userId,
          })
        );
        return yield* device.status(actor, id);
      })
    );

    expect(status).toEqual({ connectionId: null, status: "expired" });
  });
});
