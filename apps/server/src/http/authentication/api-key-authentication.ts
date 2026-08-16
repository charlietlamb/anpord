import { Auth } from "@anpord/auth";
import { API_KEY_PREFIX } from "@anpord/auth/credentials/api-key-prefix";
import { OrganizationStore } from "@anpord/auth/organization";
import { ApiKeyAuthentication } from "@anpord/schema/public/authentication";
import { HttpApiBuilder } from "@effect/platform";
import { Effect, Layer, Redacted } from "effect";
import { resolveOAuthToken } from "./oauth-token";
import { makeVerifiedKeys } from "./verified-keys";

export const ApiKeyAuthenticationLive = Layer.effect(
  ApiKeyAuthentication,
  Effect.gen(function* () {
    const auth = yield* Auth;
    const organizations = yield* OrganizationStore;
    const verifyKey = yield* makeVerifiedKeys(auth);

    return ApiKeyAuthentication.of({
      bearer: (credential) => {
        const token = Redacted.value(credential);
        return token.startsWith(API_KEY_PREFIX)
          ? verifyKey(token)
          : resolveOAuthToken(auth, token, organizations.resolveActive);
      },
    });
  })
).pipe(Layer.provide(HttpApiBuilder.middlewareCors()));
