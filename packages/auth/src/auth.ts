import { Database } from "@anpord/db/client";
import { schema } from "@anpord/db/schema";
import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { jwt, magicLink, mcp, organization } from "better-auth/plugins";
import { Context, Effect, Layer, Option, Redacted } from "effect";
import { AuthConfig } from "./config";
import { COOKIE_PREFIX } from "./cookies";
import { makeSendMagicLink } from "./email";
import type { OrganizationStoreShape } from "./organization-store";
import { OrganizationStore } from "./organization-store";

const SESSION_CACHE_SECONDS_BEFORE_REVOCATION_APPLIES = 300;
const API_KEY_PREFIX = "anp_";
const IDENTIFIABLE_PREFIX_LENGTH = 8;

const attachOrganizationBeforeWrite =
  (organizations: OrganizationStoreShape) =>
  async (session: { userId: string }) => {
    const organization = await Effect.runPromise(
      organizations
        .resolveActive(session.userId)
        .pipe(Effect.catchAll(() => Effect.succeedNone))
    );

    return Option.match(organization, {
      onNone: () => undefined,
      onSome: (activeOrganizationId) => ({
        data: { ...session, activeOrganizationId },
      }),
    });
  };

const makeAuth = Effect.gen(function* () {
  const config = yield* AuthConfig;
  const db = yield* Database;
  const organizations = yield* OrganizationStore;
  const socialProviders = config.github
    ? {
        github: {
          clientId: config.github.clientId,
          clientSecret: Redacted.value(config.github.clientSecret),
        },
      }
    : {};
  const sendMagicLink = makeSendMagicLink(config);

  return betterAuth({
    baseURL: config.url,
    trustedOrigins: [...config.trustedOrigins],
    advanced: { cookiePrefix: COOKIE_PREFIX },
    database: drizzleAdapter(db, { provider: "pg", schema }),
    session: {
      cookieCache: {
        enabled: true,
        maxAge: SESSION_CACHE_SECONDS_BEFORE_REVOCATION_APPLIES,
      },
    },
    databaseHooks: {
      session: {
        create: { before: attachOrganizationBeforeWrite(organizations) },
      },
    },
    socialProviders,
    plugins: [
      organization(),
      magicLink({
        expiresIn: 300,
        sendMagicLink: ({ email, url }) => sendMagicLink({ email, url }),
      }),
      apiKey({
        defaultPrefix: API_KEY_PREFIX,
        enableMetadata: true,
        startingCharactersConfig: {
          charactersLength: IDENTIFIABLE_PREFIX_LENGTH,
          shouldStore: true,
        },
      }),
      jwt(),
      mcp({
        loginPage: "/login",
        resource: config.mcpResource,
        oidcConfig: {
          allowDynamicClientRegistration: true,
          consentPage: "/oauth/consent",
          loginPage: "/login",
          scopes: ["prompts:read", "prompts:write"],
        },
      }),
    ],
    secret: Redacted.value(config.secret),
  });
});

export type AuthInstance = Effect.Effect.Success<typeof makeAuth>;

export class Auth extends Context.Tag("@anpord/auth/Auth")<
  Auth,
  AuthInstance
>() {}

export const AuthLive = Layer.effect(Auth, makeAuth);
