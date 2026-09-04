import { DEFAULT_BASE_URL, layer } from "@anpord/schema/public/client";
import { Config, Effect, Layer } from "effect";

export const apiKeyConfig = Config.redacted("ANPORD_API_KEY");

export const baseUrlConfig = Config.string("ANPORD_BASE_URL").pipe(
  Config.withDefault(DEFAULT_BASE_URL)
);

export const webUrlConfig = Config.string("ANPORD_WEB_URL").pipe(
  Config.withDefault("https://anpord.com")
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
