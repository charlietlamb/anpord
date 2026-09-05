import { beforeAll, describe, expect, it } from "bun:test";
import { Database, DatabaseLive } from "@anpord/db/client";
import { DatabaseConfig } from "@anpord/db/config";
import { organization } from "@anpord/db/schema/auth/organizations";
import { user } from "@anpord/db/schema/auth/users";
import { IdGeneratorLive } from "@anpord/ids/layer";
import {
  type Actor,
  OrganizationId,
  UserId,
} from "@anpord/schema/domain/actor";
import { Duration, Effect, Layer, Redacted } from "effect";
import {
  CredentialConnectionRepository,
  CredentialConnectionRepositoryLive,
} from "../../src/credentials/connection-repository";
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
const TestLayer = Layer.mergeAll(
  CredentialConnectionRepositoryLive.pipe(
    Layer.provide(Layer.mergeAll(database, IdGeneratorLive))
  ),
  database
);

const suffix = Date.now();
const owner = `org_scope_owner_${suffix}`;
const intruder = `org_scope_intruder_${suffix}`;
const userId = `user_scope_${suffix}`;

const actorOf = (organizationId: string): Actor => ({
  id: UserId.make(userId),
  isUser: true,
  organizationId: OrganizationId.make(organizationId),
  permissions: [],
});

const run = <A, E>(
  effect: Effect.Effect<A, E, CredentialConnectionRepository | Database>
): Promise<A> =>
  Effect.runPromise(
    effect.pipe(Effect.provide(TestLayer)) as Effect.Effect<A, E>
  );

describe.skipIf(skipWithoutDatabase())(
  "a credential write reaches only its own organisation",
  () => {
    beforeAll(() =>
      run(
        Effect.gen(function* () {
          const db = yield* Database;
          const now = new Date();

          yield* Effect.promise(() =>
            db.insert(organization).values([
              {
                createdAt: now,
                id: owner,
                name: "Owner",
                slug: `scope-owner-${suffix}`,
              },
              {
                createdAt: now,
                id: intruder,
                name: "Intruder",
                slug: `scope-intruder-${suffix}`,
              },
            ])
          );
          yield* Effect.promise(() =>
            db.insert(user).values({
              createdAt: now,
              email: `scope-${suffix}@example.com`,
              emailVerified: true,
              id: userId,
              name: "Scope test",
              updatedAt: now,
            })
          );
        })
      )
    );

    /* Every caller does a scoped find first, so none of these is reachable
       today. The predicate is here because a method that takes an id and
       trusts it is one refactor away from being reachable, and the row it
       would write is somebody else's credential. */
    it("refuses another organisation's row on verify, rotate and setDefault", async () => {
      const outcome = await run(
        Effect.gen(function* () {
          const repository = yield* CredentialConnectionRepository;
          const now = new Date();
          const created = yield* repository.insert(
            actorOf(owner),
            {
              authMethodId: "api-key",
              id: `credentialConnection_scope_${suffix}`,
              integrationId: "daytona",
              name: "Owned",
              organizationId: owner,
              ownerUserId: userId,
              scope: "organization",
              sealedPayload: "sealed",
              status: "active",
            },
            true
          );
          const asIntruder = actorOf(intruder);

          return {
            created,
            rotated: yield* Effect.either(
              repository.rotate(asIntruder, created, "rewritten", now)
            ),
            promoted: yield* Effect.either(
              repository.setDefault(asIntruder, created, now)
            ),
            unchanged: yield* repository.find(actorOf(owner), created.id),
            verified: yield* Effect.either(
              repository.recordVerification(asIntruder, created.id, false, now)
            ),
          };
        })
      );

      expect(outcome.verified._tag).toBe("Left");
      expect(outcome.rotated._tag).toBe("Left");
      expect(outcome.promoted._tag).toBe("Left");
      expect(outcome.unchanged.status).toBe("active");
      expect(outcome.unchanged.sealedPayload).toBe("sealed");
      expect(outcome.unchanged.revision).toBe(outcome.created.revision);
    });

    it("leaves a last-used stamp alone for another organisation", async () => {
      const outcome = await run(
        Effect.gen(function* () {
          const repository = yield* CredentialConnectionRepository;
          const created = yield* repository.insert(
            actorOf(owner),
            {
              authMethodId: "api-key",
              id: `credentialConnection_touch_${suffix}`,
              integrationId: "e2b",
              name: "Owned",
              organizationId: owner,
              ownerUserId: userId,
              scope: "organization",
              sealedPayload: "sealed",
              status: "active",
            },
            true
          );

          yield* repository.touch(intruder, created.id, new Date());

          return yield* repository.find(actorOf(owner), created.id);
        })
      );

      expect(outcome.lastUsedAt).toBe(null);
    });
  }
);
