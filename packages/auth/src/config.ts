import {
  Config,
  Context,
  Redacted as EffectRedacted,
  Layer,
  Option,
} from "effect";
import type { Redacted } from "effect/Redacted";

const githubCredentials = Config.all({
  clientId: Config.string("GITHUB_CLIENT_ID"),
  clientSecret: Config.redacted("GITHUB_CLIENT_SECRET"),
}).pipe(
  Config.option,
  Config.map(
    Option.filter(
      ({ clientId, clientSecret }) =>
        clientId.trim().length > 0 &&
        EffectRedacted.value(clientSecret).trim().length > 0
    )
  ),
  Config.map(Option.getOrUndefined)
);

const resendCredentials = Config.all({
  apiKey: Config.redacted("RESEND_API_KEY"),
  from: Config.string("EMAIL_FROM"),
}).pipe(
  Config.option,
  Config.map(
    Option.filter(
      ({ apiKey, from }) =>
        EffectRedacted.value(apiKey).trim().length > 0 && from.trim().length > 0
    )
  ),
  Config.map(Option.getOrUndefined)
);

export interface AuthConfigShape {
  readonly github:
    | { readonly clientId: string; readonly clientSecret: Redacted<string> }
    | undefined;
  readonly mcpResource: string;
  readonly resend:
    | { readonly apiKey: Redacted<string>; readonly from: string }
    | undefined;
  readonly secret: Redacted<string>;
  readonly trustedOrigins: readonly string[];
  readonly url: string;
  readonly webUrl: string;
}

export class AuthConfig extends Context.Tag("@anpord/auth/AuthConfig")<
  AuthConfig,
  AuthConfigShape
>() {}

export const AuthConfigLive = Layer.effect(
  AuthConfig,
  Config.all({
    secret: Config.redacted("BETTER_AUTH_SECRET"),
    url: Config.string("BETTER_AUTH_URL").pipe(
      Config.withDefault("http://127.0.0.1:3003")
    ),
    webUrl: Config.string("WEB_URL").pipe(
      Config.withDefault("http://localhost:3005")
    ),
    mcpResource: Config.string("MCP_RESOURCE_URL").pipe(
      Config.withDefault("http://localhost:3010/mcp")
    ),
    trustedOrigins: Config.string("AUTH_TRUSTED_ORIGINS").pipe(
      Config.map((value) =>
        value
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean)
      ),
      Config.withDefault<readonly string[]>(["http://localhost:3005"])
    ),
    github: githubCredentials,
    resend: resendCredentials,
  })
);
