import { Config, Effect, Option, Redacted } from "effect";
import { MODEL_PROVIDERS, type ModelProvider } from "../domain/model-providers";
import type { CredentialResolverShape } from "./resolver";
import { systemActor } from "./system-actor";

export interface ModelAccess {
  readonly key: string;
  readonly provider: ModelProvider;
}

const usable = (value: string | undefined) =>
  Option.fromNullable(value).pipe(
    Option.filter((found) => found.trim() !== "")
  );

const storedKey = (
  credentials: CredentialResolverShape,
  organizationId: string,
  integrationId: string,
  field: string
) =>
  credentials
    .resolve({ actor: systemActor(organizationId), integrationId })
    .pipe(
      Effect.map((value) => usable(Redacted.value(value).values[field])),
      Effect.orElseSucceed(() => Option.none<string>())
    );

const fallbackKey = (
  credentials: CredentialResolverShape,
  organizationId: string,
  variable: string
) =>
  Effect.gen(function* () {
    const fromEnv = yield* storedKey(
      credentials,
      organizationId,
      "env",
      variable
    );
    const platformKey = yield* Config.string(variable).pipe(
      Config.option,
      Effect.orDie,
      Effect.map(Option.flatMap(usable))
    );

    return Option.orElse(fromEnv, () => platformKey);
  });

export const apiKeyFor = (
  credentials: CredentialResolverShape,
  organizationId: string,
  integrationId: string,
  variable: string
) =>
  Effect.gen(function* () {
    const connected = yield* storedKey(
      credentials,
      organizationId,
      integrationId,
      "apiKey"
    );

    return Option.isSome(connected)
      ? connected
      : yield* fallbackKey(credentials, organizationId, variable);
  });

export const modelAccessFor = (
  credentials: CredentialResolverShape,
  organizationId: string,
  providerId?: string
) =>
  Effect.gen(function* () {
    const candidates = MODEL_PROVIDERS.filter(
      ({ id }) => providerId === undefined || id === providerId
    );

    for (const provider of candidates) {
      const connected = yield* storedKey(
        credentials,
        organizationId,
        provider.id,
        "apiKey"
      );

      if (Option.isSome(connected)) {
        return Option.some<ModelAccess>({ key: connected.value, provider });
      }
    }

    const openai = candidates.find(({ id }) => id === "openai");

    if (openai === undefined) {
      return Option.none<ModelAccess>();
    }

    const fallback = yield* fallbackKey(
      credentials,
      organizationId,
      "OPENAI_API_KEY"
    );

    return Option.map(
      fallback,
      (key): ModelAccess => ({ key, provider: openai })
    );
  });
