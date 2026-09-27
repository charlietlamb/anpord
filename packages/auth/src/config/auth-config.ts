import {
  LOCAL_SERVER_URL,
  LOCAL_WEB_ORIGIN,
  localMcpResource,
  MCP_PORT,
} from "@anpord/schema/internal/local-ports";
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
  Config.withDefault<readonly string[]>([LOCAL_WEB_ORIGIN])
);

export const AuthConfigLive = Layer.effect(
  AuthConfig,
  Config.all({
    github: githubCredentials,
    mcpResource: Config.string("MCP_RESOURCE_URL").pipe(
      Config.withDefault(localMcpResource(MCP_PORT))
    ),
    secret: Config.redacted("BETTER_AUTH_SECRET"),
    trustedOrigins,
    url: Config.string("BETTER_AUTH_URL").pipe(
      Config.withDefault(LOCAL_SERVER_URL)
    ),
  })
);
