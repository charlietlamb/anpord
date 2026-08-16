import { Auth } from "@anpord/auth";
import { OrganizationStore } from "@anpord/auth/organization";
import { ApiKeyAuthentication } from "@anpord/schema/public/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { Effect, Layer, Redacted } from "effect";
import { resolveApiKey } from "./credentials/api-key";
import { resolveOAuthToken } from "./credentials/oauth-token";

const API_KEY_PREFIX = "anp_";

export const ApiKeyAuthenticationLive = Layer.effect(
  ApiKeyAuthentication,
  Effect.gen(function* () {
    const auth = yield* Auth;
    const organizations = yield* OrganizationStore;

    return ApiKeyAuthentication.of({
      bearer: (credential) => {
        const token = Redacted.value(credential);
        return token.startsWith(API_KEY_PREFIX)
          ? resolveApiKey(auth, token)
          : resolveOAuthToken(auth, token, organizations.resolveActive);
      },
    });
  })
).pipe(Layer.provide(HttpApiBuilder.middlewareCors()));
