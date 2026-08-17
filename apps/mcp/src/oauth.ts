import { SUPPORTED_SCOPES } from "@anpord/schema/domain/scopes";
import { Clock, Duration, Effect } from "effect";
import { OAuthError, OAuthErrorCode, oauthCustomProvider } from "mcp-use/oauth";
import { authUrl, resource } from "./config";
import type { AnpordUser } from "./tools";

const endpoint = (name: string) => `${authUrl}/mcp/${name}`;

/** Bearer verification refuses a token whose expiry is unset. */
const FALLBACK_TTL_SECONDS = 60 * 60;

interface McpSession {
  readonly accessTokenExpiresAt?: string | number;
  readonly clientId?: string;
  readonly scopes?: readonly string[] | string;
  readonly userId?: string;
}

const invalid = (message: string) =>
  new OAuthError(OAuthErrorCode.InvalidToken, message);

/** OAuth counts expiry in whole seconds, so a millisecond instant is floored
 * rather than rounded: a token is never reported as living longer than it does. */
const epochSeconds = (millis: number) =>
  Math.floor(Duration.toSeconds(Duration.millis(millis)));

const secondsUntil = (expiresAt: McpSession["accessTokenExpiresAt"]) => {
  if (expiresAt === undefined) {
    return (
      epochSeconds(Effect.runSync(Clock.currentTimeMillis)) +
      FALLBACK_TTL_SECONDS
    );
  }
  return epochSeconds(
    typeof expiresAt === "number" ? expiresAt : Date.parse(expiresAt)
  );
};

const scopesOf = (scopes: McpSession["scopes"]) => {
  if (scopes === undefined) {
    return [...SUPPORTED_SCOPES];
  }
  return typeof scopes === "string" ? scopes.split(" ") : [...scopes];
};

/**
 * Better Auth issues opaque access tokens, so they carry no claims to verify a
 * signature against. The session behind one is resolved at the authorization
 * server instead, which is the same introspection the API performs.
 */
const verifyAccessToken = (verifiedResource: URL) => async (token: string) => {
  const response = await fetch(endpoint("get-session"), {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw invalid("Could not verify the access token");
  }

  const session = (await response.json()) as McpSession | null;
  if (!session?.userId) {
    throw invalid("Access token is not active");
  }

  return {
    clientId: session.clientId ?? "",
    expiresAt: secondsUntil(session.accessTokenExpiresAt),
    extra: { userId: session.userId },
    resource: verifiedResource,
    scopes: scopesOf(session.scopes),
    token,
  };
};

export const anpordOAuth = oauthCustomProvider<AnpordUser>({
  createTokenVerifier: (canonical) => ({
    verifyAccessToken: verifyAccessToken(canonical),
  }),
  mapAuthInfo: (authInfo) => ({
    payload: {},
    permissions: [],
    user: {
      id: String(
        (authInfo.extra as { userId?: string } | undefined)?.userId ?? ""
      ),
      roles: [],
    },
  }),
  oauthMetadata: {
    authorization_endpoint: endpoint("authorize"),
    code_challenge_methods_supported: ["S256"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    issuer: authUrl,
    registration_endpoint: endpoint("register"),
    response_types_supported: ["code"],
    scopes_supported: [...SUPPORTED_SCOPES],
    token_endpoint: endpoint("token"),
  },
  resource,
});
