import { Database } from "@anpord/db/client";
import { schema } from "@anpord/db/schema";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { magicLink, organization } from "better-auth/plugins";
import { Context, Effect, Layer, Redacted } from "effect";
import { AuthConfig } from "./config";
import { COOKIE_PREFIX } from "./cookies";
import { resolveActiveOrganization } from "./default-organization";
import { makeSendMagicLink } from "./email";

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
            const activeOrganizationId = await resolveActiveOrganization(
              db,
              session.userId
            );

            return activeOrganizationId
              ? { data: { ...session, activeOrganizationId } }
              : undefined;
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
