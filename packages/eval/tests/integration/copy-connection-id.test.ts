import { describe, expect, it } from "bun:test";
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
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import {
  deriveEnvelopeKey,
  sealEnvelope,
} from "../../src/credentials/envelope";

const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));

type Services = Database;

const run = <A, E>(effect: Effect.Effect<A, E, Services>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(testDatabase()), Effect.scoped) as Effect.Effect<
      A,
      E
    >
  );

const suffix = Date.now();
const sourceOrganizationId = `org_copy_id_src_${suffix}`;
const sourceSlug = `copy-id-src-${suffix}`;
const destinationSlug = `copy-id-dst-${suffix}`;
const userId = `user_copy_id_${suffix}`;
const memberId = `member_copy_id_${suffix}`;
const connectionId = `con_seed_${suffix}`;
const encryptionKey = `copy-id-test-key-${suffix}`;

describe.skipIf(skipWithoutDatabase())("scripts/copy-connection.ts", () => {
  it("mints the copy's id with the con_ prefix @anpord/ids assigns credentialConnection", async () => {
    const context = `${sourceOrganizationId}\0${connectionId}\0codex`;
    const key = await deriveEnvelopeKey(encryptionKey);
    const sealedPayload = await sealEnvelope(
      key,
      JSON.stringify({ authJson: "seeded-secret" }),
      context
    );

    await run(
      Effect.gen(function* () {
        const db = yield* Database;

        yield* Effect.promise(() =>
          db.insert(user).values({
            createdAt: new Date(),
            email: `${userId}@local.test`,
            emailVerified: true,
            id: userId,
            name: "Copy Connection Owner",
            updatedAt: new Date(),
          })
        );

        yield* Effect.promise(() =>
          db.insert(organization).values({
            createdAt: new Date(),
            id: sourceOrganizationId,
            name: sourceSlug,
            slug: sourceSlug,
          })
        );

        yield* Effect.promise(() =>
          db.insert(member).values({
            createdAt: new Date(),
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

    const result = Bun.spawnSync(
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
          CREDENTIALS_ENCRYPTION_KEY: encryptionKey,
          DATABASE_URL: testDatabaseUrl(),
        },
      }
    );

    expect(result.exitCode).toBe(0);

    const copied = await run(
      Effect.gen(function* () {
        const db = yield* Database;

        return yield* Effect.promise(() =>
          db
            .select()
            .from(credentialConnection)
            .innerJoin(
              organization,
              eq(organization.id, credentialConnection.organizationId)
            )
            .where(eq(organization.slug, destinationSlug))
        );
      })
    );

    expect(copied).toHaveLength(1);
    const copiedId = copied[0]?.credential_connection.id ?? "";
    expect(copiedId.startsWith("con_")).toBe(true);
    expect(copiedId.startsWith("ccn_")).toBe(false);
  }, 30_000);
});
