import { Actor, OrganizationId, UserId } from "@anpord/schema/domain/actor";
import { Config, Effect, Option, Redacted } from "effect";
import { MODEL_PROVIDERS, type ModelProvider } from "../domain/model-providers";
import type { CredentialResolverShape } from "./resolver";

export interface ModelAccess {
  readonly key: string;
  readonly provider: ModelProvider;
}

/* A blank value is set but unusable, so it counts as absent rather than as a
   configured key. */
const usable = (value: string | undefined) =>
  Option.fromNullable(value).pipe(
    Option.filter((found) => found.trim() !== "")
  );

/* Whichever provider the organization has connected, preferring the order the
   table declares. The platform key is OpenAI's, so it stands in only for that
   one. */
export const modelAccessFor = (
  credentials: CredentialResolverShape,
  organizationId: string
) =>
  Effect.gen(function* () {
    const actor = Actor.make({
      id: UserId.make(organizationId),
      organizationId: OrganizationId.make(organizationId),
      isUser: false,
      permissions: [],
    });
    const stored = (integrationId: string, field: string) =>
      credentials.resolve({ actor, integrationId }).pipe(
        Effect.map((value) => usable(Redacted.value(value).values[field])),
        Effect.catchAll(() => Effect.succeed(Option.none<string>()))
      );

    for (const provider of MODEL_PROVIDERS) {
      const connected = yield* stored(provider.id, "apiKey");

      if (Option.isSome(connected)) {
        return Option.some<ModelAccess>({ key: connected.value, provider });
      }
    }

    const openai = MODEL_PROVIDERS.find(({ id }) => id === "openai");

    if (openai === undefined) {
      return Option.none<ModelAccess>();
    }

    const fromEnv = yield* stored("env", "OPENAI_API_KEY");
    const platformKey = yield* Config.string("OPENAI_API_KEY").pipe(
      Config.option,
      Effect.orDie,
      Effect.map((found) => Option.flatMap(found, (value) => usable(value)))
    );

    return fromEnv.pipe(
      Option.orElse(() => platformKey),
      Option.map((key) => ({ key, provider: openai }) satisfies ModelAccess)
    );
  });
