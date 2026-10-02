import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { HttpApi, HttpApiBuilder, HttpServer } from "@effect/platform";
import { Auth, type AuthInstance } from "@sphynx/auth";
import {
  OrganizationStore,
  OrganizationStoreLive,
} from "@sphynx/auth/organization";
import { OrganizationStoreError } from "@sphynx/auth/organization/errors";
import { AutumnServiceLive } from "@sphynx/billing/autumn";
import { BillingConfig } from "@sphynx/billing/config";
import { Database } from "@sphynx/db/client";
import { organization } from "@sphynx/db/schema/auth/organizations";
import { skipWithoutDatabase, testDatabase } from "@sphynx/db/test-database";
import { IdGeneratorLive } from "@sphynx/ids/layer";
import { AuthGroup } from "@sphynx/schema/public/auth-api";
import { Duration, Effect, Layer } from "effect";
import { ApiKeyAuthenticationLive } from "../../../../src/http/authentication/api-key-authentication";
import { VerifiedKeysLive } from "../../../../src/http/authentication/verified-keys";
import { AuthHandlers } from "../../../../src/routes/public/auth/handlers";

const skip = skipWithoutDatabase();

const suffix = Date.now();
const organizationId = `org_whoami_${suffix}`;
const goneOrganizationId = `org_whoami_gone_${suffix}`;
const SECRET = "anp_whoamiSecretValue";
const ORPHAN_SECRET = "anp_orphanSecretValue";

const verifiedKey = (referenceId: string) => ({
  valid: true,
  key: {
    name: "ci",
    permissions: { evals: ["read", "write"] },
    referenceId,
    start: "anp_whoa",
  },
});

const auth = {
  api: {
    verifyApiKey: ({ body }: { body: { key: string } }) => {
      if (body.key === SECRET) {
        return Promise.resolve(verifiedKey(organizationId));
      }
      if (body.key === ORPHAN_SECRET) {
        return Promise.resolve(verifiedKey(goneOrganizationId));
      }
      return Promise.resolve({ key: null, valid: false });
    },
  },
} as unknown as AuthInstance;

const database = testDatabase({
  poolMax: 2,
  statementTimeout: Duration.seconds(10),
});

const organizations = OrganizationStoreLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      database,
      IdGeneratorLive,
      AutumnServiceLive.pipe(
        Layer.provide(Layer.succeed(BillingConfig, { autumn: undefined }))
      )
    )
  )
);

const authLayer = Layer.succeed(Auth, auth);

const WhoamiApi = HttpApi.make("sphynx-public").add(AuthGroup).prefix("/v1");

const serve = () =>
  HttpApiBuilder.toWebHandler(
    Layer.mergeAll(
      HttpApiBuilder.api(WhoamiApi).pipe(
        Layer.provide(AuthHandlers),
        Layer.provide(ApiKeyAuthenticationLive),
        Layer.provide(VerifiedKeysLive.pipe(Layer.provide(authLayer))),
        Layer.provide(Layer.mergeAll(organizations, authLayer))
      ),
      HttpServer.layerContext
    )
  );

const whoami = (handler: ReturnType<typeof serve>, token: string) =>
  handler.handler(
    new Request("http://sphynx.test/v1/auth.whoami", {
      body: "{}",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      method: "POST",
    })
  );

const withDatabase = <A>(run: (db: Database["Type"]) => Promise<A>) =>
  Effect.runPromise(
    Effect.flatMap(Database, (db) => Effect.promise(() => run(db))).pipe(
      Effect.provide(database)
    )
  );

describe.skipIf(skip)("POST /v1/auth.whoami", () => {
  const handler = serve();

  beforeAll(async () => {
    await withDatabase((db) =>
      db.insert(organization).values({
        createdAt: new Date(),
        id: organizationId,
        name: "Whoami Test",
        slug: `whoami-test-${suffix}`,
      })
    );
  });

  afterAll(() => handler.dispose());

  test("names the organization and key a caller's runs land in", async () => {
    const response = await whoami(handler, SECRET);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(JSON.parse(body)).toEqual({
      credential: { kind: "apiKey", name: "ci", start: "anp_whoa" },
      organization: {
        id: organizationId,
        name: "Whoami Test",
        slug: `whoami-test-${suffix}`,
      },
      permissions: ["evals:read", "evals:write"],
    });
    expect(body.includes(SECRET)).toBe(false);
  });

  test("a key whose organization is gone gets a 404 that says so", async () => {
    const response = await whoami(handler, ORPHAN_SECRET);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      _tag: "NotFound",
      message: "This credential's organization no longer exists.",
    });
  });

  test("an unknown key is refused before any organization is read", async () => {
    const response = await whoami(handler, "anp_notAKey");

    expect(response.status).toBe(401);
  });
});

const brokenStore = Layer.succeed(
  OrganizationStore,
  OrganizationStore.of({
    existingActive: () => Effect.succeedNone,
    find: () =>
      Effect.fail(
        new OrganizationStoreError({
          cause: new Error("connection reset"),
          operation: "organization.findById",
        })
      ),
    resolveActive: () => Effect.die("unused"),
    roleOf: () => Effect.succeedNone,
  })
);

describe("POST /v1/auth.whoami when the organization cannot be read", () => {
  const handler = HttpApiBuilder.toWebHandler(
    Layer.mergeAll(
      HttpApiBuilder.api(WhoamiApi).pipe(
        Layer.provide(AuthHandlers),
        Layer.provide(ApiKeyAuthenticationLive),
        Layer.provide(VerifiedKeysLive.pipe(Layer.provide(authLayer))),
        Layer.provide(Layer.mergeAll(brokenStore, authLayer))
      ),
      HttpServer.layerContext
    )
  );

  afterAll(() => handler.dispose());

  test("answers with an error that says to try again", async () => {
    const response = await whoami(handler, SECRET);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      _tag: "InternalError",
      message:
        "Unable to read this credential's organization. Try again in a moment.",
    });
  });
});
