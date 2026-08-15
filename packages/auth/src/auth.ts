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
import { resolveActiveOrganization } from "./organization-store";

const makeAuth = Effect.gen(function* () {
  const config = yield* AuthConfig;
  const db = yield* Database;
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
      /**
       * Cache the validated session in a signed cookie so repeated reads resolve
       * without a database round-trip. The short TTL keeps revocation responsive.
       */
      cookieCache: { enabled: true, maxAge: 300 },
    },
    databaseHooks: {
      session: {
        create: {
          /**
           * Attaching the organization as the session is written means a first
           * sign-in already has one, so nothing downstream has to handle a
           * session that cannot address any data.
           */
          before: async (session) => {
            /** The one place this leaves Effect: Better Auth wants a promise. */
            const resolved = await Effect.runPromise(
              resolveActiveOrganization(db, session.userId).pipe(
                Effect.catchAll(() => Effect.succeedNone)
              )
            );

            return Option.match(resolved, {
              onNone: () => undefined,
              onSome: (activeOrganizationId) => ({
                data: { ...session, activeOrganizationId },
              }),
            });
          },
        },
      },
    },
    socialProviders,
    plugins: [
      organization(),
      magicLink({
        expiresIn: 300,
        sendMagicLink: ({ email, url }) => sendMagicLink({ email, url }),
      }),
      /**
       * Keys authenticate the public API. The plugin stores only a hash, so a
       * key is shown once at creation and never again; the leading characters
       * are kept in the clear so the dashboard can identify a key in a list.
       */
      apiKey({
        defaultPrefix: "anp_",
        enableMetadata: true,
        startingCharactersConfig: {
          charactersLength: 8,
          shouldStore: true,
        },
      }),
      jwt(),
      mcp({
        loginPage: "/login",
        /** RFC 8707: tokens are bound to the MCP server, not the site. */
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
