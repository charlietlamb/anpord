import { AutumnService } from "@anpord/billing/autumn";
import { Database } from "@anpord/db/client";
import { schema } from "@anpord/db/schema";
import { IdGenerator } from "@anpord/ids/id";
import { EmailSender } from "@anpord/notifications/email/sender";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { jwt, magicLink, organization } from "better-auth/plugins";
import { Context, Effect, Layer, Redacted } from "effect";
import { AuthConfig } from "./config/auth-config";
import { apiKeyPlugin } from "./credentials/api-key-plugin";
import { mcpPlugin } from "./oauth/mcp-plugin";
import { attachOrganizationBeforeWrite } from "./organization/attach-organization-before-write";
import { OrganizationStore } from "./organization/organization-store";
import { registerBillingCustomer } from "./organization/register-billing-customer";
import { seedDefaultChannel } from "./organization/seed-default-channel";
import { COOKIE_PREFIX } from "./session/cookies";
import {
  MAGIC_LINK_EXPIRY_SECONDS,
  sendMagicLink,
} from "./session/send-magic-link";

const SESSION_CACHE_SECONDS_BEFORE_REVOCATION_APPLIES = 300;

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
      organization({
        organizationHooks: {
          afterCreateOrganization: ({ organization: created }) =>
            Effect.runPromise(
              Effect.all(
                [
                  seedDefaultChannel(db, ids, created.id),
                  registerBillingCustomer(autumn, created),
                ],
                { concurrency: 2, discard: true }
              )
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
