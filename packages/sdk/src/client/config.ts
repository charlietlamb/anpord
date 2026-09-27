import { layer } from "@anpord/schema/public/client";
import { API_ORIGIN, WEB_ORIGIN } from "@anpord/schema/public/origins";
import { Config, ConfigError, Effect, Either, Layer, Redacted } from "effect";

const API_KEY = "ANPORD_API_KEY";

export const apiKeyConfig = Config.string(API_KEY).pipe(
  Config.mapOrFail((key) =>
    key.trim() === ""
      ? Either.left(ConfigError.MissingData([API_KEY], `${API_KEY} is empty`))
      : Either.right(Redacted.make(key.trim()))
  )
);

export const baseUrlConfig = Config.string("ANPORD_BASE_URL").pipe(
  Config.withDefault(API_ORIGIN)
);

export const webUrlConfig = Config.string("ANPORD_WEB_URL").pipe(
  Config.withDefault(WEB_ORIGIN)
);

export const clientOptionsConfig = Config.all({
  apiKey: apiKeyConfig,
  baseUrl: baseUrlConfig,
});

/* Attached to the commands that call the API rather than to the CLI root, so
   a command that only reads a local file never asks for a key. */
export const ClientLayer = Layer.unwrapEffect(
  Effect.map(clientOptionsConfig, layer)
);
