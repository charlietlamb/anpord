import { DEFAULT_BASE_URL } from "@anpord/schema/public/client";
import { Config } from "effect";

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
