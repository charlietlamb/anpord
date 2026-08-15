import { Config, type Redacted } from "effect";
import { DEFAULT_BASE_URL } from "./client";

export const apiKeyConfig = Config.redacted("ANPORD_API_KEY");

export const baseUrlConfig = Config.string("ANPORD_BASE_URL").pipe(
  Config.withDefault(DEFAULT_BASE_URL)
);

export const clientOptionsConfig = Config.all({
  apiKey: apiKeyConfig,
  baseUrl: baseUrlConfig,
});

export interface ResolvedClientOptions {
  readonly apiKey: Redacted.Redacted<string>;
  readonly baseUrl: string;
}
