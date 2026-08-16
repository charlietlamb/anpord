import { Config, Context, Layer, type Redacted } from "effect";
import type { GithubCredentials } from "./github-credentials";
import { githubCredentials } from "./github-credentials";

export interface AuthConfigShape {
  readonly github: GithubCredentials | undefined;
  readonly mcpResource: string;
  readonly secret: Redacted.Redacted<string>;
  readonly trustedOrigins: readonly string[];
  readonly url: string;
}

export class AuthConfig extends Context.Tag("@anpord/auth/AuthConfig")<
  AuthConfig,
  AuthConfigShape
>() {}

const trustedOrigins = Config.string("AUTH_TRUSTED_ORIGINS").pipe(
  Config.map((value) =>
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  ),
  Config.withDefault<readonly string[]>(["http://localhost:3005"])
);

export const AuthConfigLive = Layer.effect(
  AuthConfig,
  Config.all({
    github: githubCredentials,
    mcpResource: Config.string("MCP_RESOURCE_URL").pipe(
      Config.withDefault("http://localhost:3010/mcp")
    ),
    secret: Config.redacted("BETTER_AUTH_SECRET"),
    trustedOrigins,
    url: Config.string("BETTER_AUTH_URL").pipe(
      Config.withDefault("http://127.0.0.1:3003")
    ),
  })
);
