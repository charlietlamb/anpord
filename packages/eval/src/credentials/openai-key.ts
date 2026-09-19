import { Actor, OrganizationId, UserId } from "@anpord/schema/domain/actor";
import { Config, Effect, Option, Redacted } from "effect";
import type { CredentialResolverShape } from "./resolver";

/* Three places accept the same key, and a caller that reads fewer of them
   refuses work another part of the product would have done. A blank value is
   set but unusable, so it counts as absent rather than as a configured key. */
export const openAiKeyFor = (
  credentials: CredentialResolverShape,
  organizationId: string
) =>
  Effect.gen(function* () {
    const platformKey = yield* Config.string("OPENAI_API_KEY").pipe(
      Config.option,
      Effect.orDie
    );
    const actor = Actor.make({
      id: UserId.make(organizationId),
      organizationId: OrganizationId.make(organizationId),
      isUser: false,
      permissions: [],
    });
    const stored = (integrationId: string, field: string) =>
      credentials.resolve({ actor, integrationId }).pipe(
        Effect.map((value) =>
          Option.fromNullable(Redacted.value(value).values[field])
        ),
        Effect.catchAll(() => Effect.succeed(Option.none<string>()))
      );

    const connected = yield* stored("openai", "apiKey");
    const fromEnv = yield* stored("env", "OPENAI_API_KEY");

    return connected.pipe(
      Option.orElse(() => fromEnv),
      Option.orElse(() => platformKey),
      Option.filter((found) => found.trim() !== "")
    );
  });
