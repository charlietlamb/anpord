import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";
import { Database } from "@anpord/db/client";
import { member } from "@anpord/db/schema/auth/members";
import { organization } from "@anpord/db/schema/auth/organizations";
import { user } from "@anpord/db/schema/auth/users";
import { credentialConnection } from "@anpord/db/schema/credentials/connections";
import {
  skipWithoutDatabase,
  testDatabase,
  testDatabaseUrl,
} from "@anpord/db/test-database";
import { eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import {
  deriveEnvelopeKey,
  openEnvelope,
  sealEnvelope,
} from "../../src/credentials/envelope";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));

const run = <A, E>(effect: Effect.Effect<A, E, Database>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(testDatabase()), Effect.scoped) as Effect.Effect<
      A,
      E
    >
  );

const suffix = Date.now();
const sourceOrganizationId = `org_copy_src_${suffix}`;
const sourceSlug = `copy-src-${suffix}`;
const destinationSlug = `copy-dst-${suffix}`;
const userId = `user_copy_${suffix}`;
const memberId = `member_copy_${suffix}`;
const connectionId = `con_seed_${suffix}`;
const realKey = `real-encryption-key-${suffix}`;
const decoyKey = `decoy-better-auth-secret-${suffix}`;

const seedSource = async () => {
  const key = await deriveEnvelopeKey(realKey);
  const sealedPayload = await sealEnvelope(
    key,
    JSON.stringify({ authJson: "seeded-secret" }),
    `${sourceOrganizationId}\0${connectionId}\0codex`
  );

  await run(
    Effect.gen(function* () {
      const db = yield* Database;
      const now = new Date();

      yield* Effect.promise(() =>
        db.insert(user).values({
          createdAt: now,
          email: `${userId}@local.test`,
          emailVerified: true,
          id: userId,
          name: "Copy Connection Owner",
          updatedAt: now,
        })
      );
      yield* Effect.promise(() =>
        db.insert(organization).values({
          createdAt: now,
          id: sourceOrganizationId,
          name: sourceSlug,
          slug: sourceSlug,
        })
      );
      yield* Effect.promise(() =>
        db.insert(member).values({
          createdAt: now,
          id: memberId,
          organizationId: sourceOrganizationId,
          role: "owner",
          userId,
        })
      );
      yield* Effect.promise(() =>
        db.insert(credentialConnection).values({
          authMethodId: "auth-json",
          id: connectionId,
          integrationId: "codex",
          isDefault: true,
          name: "seeded",
          organizationId: sourceOrganizationId,
          scope: "organization",
          sealedPayload,
          status: "active",
        })
      );
    })
  );
};

const copyConnection = () =>
  Bun.spawnSync(
    [
      "bun",
      "run",
      "scripts/copy-connection.ts",
      "--from",
      sourceSlug,
      "--to",
      destinationSlug,
      "--integration",
      "codex",
    ],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        BETTER_AUTH_SECRET: decoyKey,
        CREDENTIALS_ENCRYPTION_KEY: realKey,
        DATABASE_URL: testDatabaseUrl(),
      },
    }
  );

const removeSeededRows = () =>
  run(
    Effect.gen(function* () {
      const db = yield* Database;

      yield* Effect.promise(() =>
        db
          .delete(organization)
          .where(inArray(organization.slug, [sourceSlug, destinationSlug]))
      );
      yield* Effect.promise(() => db.delete(user).where(eq(user.id, userId)));
    })
  );

describe.skipIf(skipWithoutDatabase())("scripts/copy-connection.ts", () => {
  let outcome: { exitCode: number; stderr: string };

  beforeAll(async () => {
    await seedSource();
    const result = copyConnection();
    outcome = { exitCode: result.exitCode, stderr: result.stderr.toString() };
  }, 30_000);

  afterAll(removeSeededRows);

  it("opens the source with CREDENTIALS_ENCRYPTION_KEY, not BETTER_AUTH_SECRET alone", () => {
    expect(outcome).toEqual({
      exitCode: 0,
      stderr: expect.stringContaining("Copied"),
    });
  });

  it("mints the copy's id with the con_ prefix @anpord/ids assigns credentialConnection", async () => {
    const copied = await run(
      Effect.gen(function* () {
        const db = yield* Database;

        return yield* Effect.promise(() =>
          db
            .select({ id: credentialConnection.id })
            .from(credentialConnection)
            .innerJoin(
              organization,
              eq(organization.id, credentialConnection.organizationId)
            )
            .where(eq(organization.slug, destinationSlug))
        );
      })
    );

    expect({
      prefixes: copied.map((row) => row.id.slice(0, 4)),
      stderr: outcome.stderr,
    }).toEqual({
      prefixes: ["con_"],
      stderr: expect.stringContaining("Copied"),
    });
  });

  it("seals the copy under the destination context so it opens there", async () => {
    const [copied] = await run(
      Effect.gen(function* () {
        const db = yield* Database;

        return yield* Effect.promise(() =>
          db
            .select({
              id: credentialConnection.id,
              organizationId: credentialConnection.organizationId,
              sealedPayload: credentialConnection.sealedPayload,
            })
            .from(credentialConnection)
            .innerJoin(
              organization,
              eq(organization.id, credentialConnection.organizationId)
            )
            .where(eq(organization.slug, destinationSlug))
        );
      })
    );
    const key = await deriveEnvelopeKey(realKey);

    expect(
      await openEnvelope(
        key,
        copied?.sealedPayload ?? "",
        `${copied?.organizationId}\0${copied?.id}\0codex`
      )
    ).toBe(JSON.stringify({ authJson: "seeded-secret" }));
  });
});
