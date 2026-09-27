import type { AuthInstance } from "@anpord/auth";
import { Actor } from "@anpord/schema/domain/actor";
import type { Permission } from "@anpord/schema/domain/permissions";
import { Effect, Option, Schema } from "effect";
import { unauthorized } from "./unauthorized";

const API_KEY_PERMISSIONS: readonly Permission[] = [
  "prompts:read",
  "prompts:write",
  "channels:read",
  "channels:write",
  "evals:read",
  "evals:write",
];

type VerifiedKey = NonNullable<
  Awaited<ReturnType<AuthInstance["api"]["verifyApiKey"]>>["key"]
>;

export const resolveApiKeyPermissions = (
  scopes: VerifiedKey["permissions"]
): readonly Permission[] =>
  scopes == null
    ? API_KEY_PERMISSIONS
    : API_KEY_PERMISSIONS.filter((permission) => {
        const [resource, action] = permission.split(":");
        return scopes[resource]?.includes(action) === true;
      });

export const resolveApiKey = (auth: AuthInstance, token: string) =>
  Effect.gen(function* () {
    const verified = yield* Effect.tryPromise({
      catch: () => unauthorized("Could not verify the API key"),
      try: () => auth.api.verifyApiKey({ body: { key: token } }),
    });

    const key = Option.fromNullable(verified.valid ? verified.key : null);
    if (Option.isNone(key)) {
      return yield* Effect.fail(unauthorized("Invalid API key"));
    }

    return yield* Schema.decodeUnknown(Actor)({
      id: key.value.referenceId,
      organizationId: key.value.referenceId,
      permissions: resolveApiKeyPermissions(key.value.permissions),
      isUser: false,
      apiKey: { name: key.value.name, start: key.value.start },
    }).pipe(Effect.mapError(() => unauthorized("API key is malformed")));
  }).pipe(Effect.withSpan("Authentication.resolveApiKey"));
