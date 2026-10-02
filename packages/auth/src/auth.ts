import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { AutumnService } from "@sphynx/billing/autumn";
import { Database } from "@sphynx/db/client";
import { schema } from "@sphynx/db/schema";
import { IdGenerator } from "@sphynx/ids/id";
import { EmailSender } from "@sphynx/notifications/email/sender";
import { DEFAULT_PLATFORM_ROLE } from "@sphynx/schema/domain/permissions";
import { COOKIE_PREFIX } from "@sphynx/schema/internal/authentication";
import { betterAuth } from "better-auth";
import { admin, jwt, magicLink, organization } from "better-auth/plugins";
import { Context, Duration, Effect, Layer, Redacted } from "effect";
import { AuthConfig } from "./config/auth-config";
import { apiKeyPlugin } from "./credentials/api-key-plugin";
import { mcpPlugin } from "./oauth/mcp-plugin";
import { attachOrganizationBeforeWrite } from "./organization/attach-organization-before-write";
import { OrganizationStore } from "./organization/organization-store";
import { sendOrganizationInvite } from "./organization/send-organization-invite";
import { setUpOrganization } from "./organization/set-up-organization";
import { MAGIC_LINK_EXPIRY, sendMagicLink } from "./session/send-magic-link";

const SESSION_CACHE_BEFORE_REVOCATION_APPLIES = Duration.minutes(5);

/* Short so a forgotten impersonation expires on its own. */
const IMPERSONATION_SESSION = Duration.hours(1);

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
  const deliverInvitation = sendOrganizationInvite(emails);

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
        impersonationSessionDuration: Duration.toSeconds(IMPERSONATION_SESSION),
      }),
      organization({
        sendInvitationEmail: (invitation) => deliverInvitation(invitation),
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
        expiresIn: Duration.toSeconds(MAGIC_LINK_EXPIRY),
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
        maxAge: Duration.toSeconds(SESSION_CACHE_BEFORE_REVOCATION_APPLIES),
      },
    },
    socialProviders,
    trustedOrigins: [...config.trustedOrigins],
  });
});

export type AuthInstance = Effect.Effect.Success<typeof makeAuth>;

export class Auth extends Context.Tag("@sphynx/auth/Auth")<
  Auth,
  AuthInstance
>() {}

export const AuthLive = Layer.effect(Auth, makeAuth);
