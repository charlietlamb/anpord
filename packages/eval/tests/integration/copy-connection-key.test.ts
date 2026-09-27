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
const sourceOrganizationId = `org_copy_key_src_${suffix}`;
const sourceSlug = `copy-key-src-${suffix}`;
const destinationSlug = `copy-key-dst-${suffix}`;
const userId = `user_copy_key_${suffix}`;
const memberId = `member_copy_key_${suffix}`;
const connectionId = `ccon_seed_${suffix}`;
const realKey = `real-encryption-key-${suffix}`;
const decoyKey = `decoy-better-auth-secret-${suffix}`;

describe.skipIf(skipWithoutDatabase())("scripts/copy-connection.ts", () => {
  it("opens the source with CREDENTIALS_ENCRYPTION_KEY, not BETTER_AUTH_SECRET alone", async () => {
    const context = `${sourceOrganizationId}\0${connectionId}\0codex`;
    const key = await deriveEnvelopeKey(realKey);
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
          BETTER_AUTH_SECRET: decoyKey,
          CREDENTIALS_ENCRYPTION_KEY: realKey,
          DATABASE_URL: testDatabaseUrl(),
        },
      }
    );

    expect({
      exitCode: result.exitCode,
      stderr: result.stderr.toString(),
    }).toEqual({ exitCode: 0, stderr: expect.stringContaining("Copied") });
  }, 30_000);
});
