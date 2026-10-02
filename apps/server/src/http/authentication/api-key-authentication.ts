import { HttpApiBuilder } from "@effect/platform";
import { Auth } from "@sphynx/auth";
import { API_KEY_PREFIX } from "@sphynx/auth/credentials/api-key-prefix";
import { OrganizationStore } from "@sphynx/auth/organization";
import { ApiKeyAuthentication } from "@sphynx/schema/public/authentication";
import { Effect, Layer, Redacted } from "effect";
import { resolveOAuthToken } from "./oauth-token";
import { VerifiedKeys } from "./verified-keys";

export const ApiKeyAuthenticationLive = Layer.effect(
  ApiKeyAuthentication,
  Effect.gen(function* () {
    const auth = yield* Auth;
    const organizations = yield* OrganizationStore;
    const keys = yield* VerifiedKeys;

    return ApiKeyAuthentication.of({
      bearer: (credential) => {
        const token = Redacted.value(credential);
        return token.startsWith(API_KEY_PREFIX)
          ? keys.verify(token)
          : resolveOAuthToken(auth, token, organizations.resolveActive);
      },
    });
  })
).pipe(Layer.provide(HttpApiBuilder.middlewareCors()));
