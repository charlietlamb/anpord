import { AutumnService } from "@anpord/billing/autumn";
import { Database } from "@anpord/db/client";
import { schema } from "@anpord/db/schema";
import { IdGenerator } from "@anpord/ids/id";
import { EmailSender } from "@anpord/notifications/email/sender";
import { DEFAULT_PLATFORM_ROLE } from "@anpord/schema/domain/permissions";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { admin, jwt, magicLink, organization } from "better-auth/plugins";
import { Context, Effect, Layer, Redacted } from "effect";
import { AuthConfig } from "./config/auth-config";
import { apiKeyPlugin } from "./credentials/api-key-plugin";
import { mcpPlugin } from "./oauth/mcp-plugin";
import { attachOrganizationBeforeWrite } from "./organization/attach-organization-before-write";
import { OrganizationStore } from "./organization/organization-store";
import { setUpOrganization } from "./organization/set-up-organization";
import { COOKIE_PREFIX } from "./session/cookies";
import {
  MAGIC_LINK_EXPIRY_SECONDS,
  sendMagicLink,
} from "./session/send-magic-link";

const SESSION_CACHE_SECONDS_BEFORE_REVOCATION_APPLIES = 300;

/* Short enough that a forgotten impersonation expires on its own, rather than
   leaving a staff member holding someone else's session for a working day. */
const IMPERSONATION_SESSION_SECONDS = 60 * 60;

const makeAuth = Effect.gen(function* () {
  const config = yield* AuthConfig;
  const db = yield* Database;
  const organizations = yield* OrganizationStore;
  const emails = yield* EmailSender;
  const ids = yield* IdGenerator;
  const autumn = yield* AutumnService;

  const socialProviders = config.github
    ? {
        github: {
          clientId: config.github.clientId,
          clientSecret: Redacted.value(config.github.clientSecret),
        },
      }
    : {};

  const deliverMagicLink = sendMagicLink(emails);

  return betterAuth({
    advanced: {
      cookiePrefix: COOKIE_PREFIX,
      ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
    },
    baseURL: config.url,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    databaseHooks: {
      session: {
        create: { before: attachOrganizationBeforeWrite(organizations) },
      },
    },
    plugins: [
      admin({
        defaultRole: DEFAULT_PLATFORM_ROLE,
        impersonationSessionDuration: IMPERSONATION_SESSION_SECONDS,
      }),
      organization({
        organizationHooks: {
          afterCreateOrganization: ({ organization: created, user }) =>
            Effect.runPromise(
              setUpOrganization(db, ids, autumn, {
                email: user.email,
                id: created.id,
                name: created.name,
              })
            ),
        },
      }),
      magicLink({
        expiresIn: MAGIC_LINK_EXPIRY_SECONDS,
        sendMagicLink: ({ email, url }) => deliverMagicLink({ email, url }),
      }),
      apiKeyPlugin(),
      jwt(),
      mcpPlugin(config.mcpResource),
    ],
    secret: Redacted.value(config.secret),
    session: {
      cookieCache: {
        enabled: true,
        maxAge: SESSION_CACHE_SECONDS_BEFORE_REVOCATION_APPLIES,
      },
    },
    socialProviders,
    trustedOrigins: [...config.trustedOrigins],
  });
});

export type AuthInstance = Effect.Effect.Success<typeof makeAuth>;

export class Auth extends Context.Tag("@anpord/auth/Auth")<
  Auth,
  AuthInstance
>() {}

export const AuthLive = Layer.effect(Auth, makeAuth);
