import { Auth } from "@anpord/auth";
import { resolveActiveOrganization } from "@anpord/auth/organization";
import { Database } from "@anpord/db/client";
import { ApiKeyAuthentication } from "@anpord/schema/public/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { Effect, Layer, Redacted } from "effect";
import { resolveApiKey } from "./credentials/api-key";
import { resolveOAuthToken } from "./credentials/oauth-token";

const API_KEY_PREFIX = "anp_";

/**
 * Both credentials resolve to the same actor, so nothing downstream knows how
 * the caller authenticated. A machine uses a key it minted; a person going
 * through an MCP client uses their own token and gets their own organization
 * rather than the key owner's.
 */
export const ApiKeyAuthenticationLive = Layer.effect(
  ApiKeyAuthentication,
  Effect.gen(function* () {
    const auth = yield* Auth;
    const db = yield* Database;

    return ApiKeyAuthentication.of({
      bearer: (credential) => {
        const token = Redacted.value(credential);
        return token.startsWith(API_KEY_PREFIX)
          ? resolveApiKey(auth, token)
          : resolveOAuthToken(auth, token, (userId) =>
              resolveActiveOrganization(db, userId)
            );
      },
    });
  })
).pipe(Layer.provide(HttpApiBuilder.middlewareCors()));
