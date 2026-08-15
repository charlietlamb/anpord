import { PublicApi } from "@anpord/schema/public/api";
import {
  FetchHttpClient,
  HttpApiClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { Effect, Layer, Redacted } from "effect";

export const DEFAULT_BASE_URL = "https://api.anpord.com";

export interface ClientOptions {
  readonly apiKey: Redacted.Redacted<string>;
  readonly baseUrl?: string;
}

/**
 * Derived from the same definition that serves traffic and generates the
 * OpenAPI document, so a change to an endpoint reaches every consumer at once.
 */
export const make = ({ apiKey, baseUrl = DEFAULT_BASE_URL }: ClientOptions) =>
  HttpApiClient.make(PublicApi, {
    baseUrl,
    transformClient: HttpClient.mapRequest(
      HttpClientRequest.bearerToken(Redacted.value(apiKey))
    ),
  });

export type AnpordClient = Effect.Effect.Success<ReturnType<typeof make>>;

export class AnpordApi extends Effect.Tag("@anpord/sdk/AnpordApi")<
  AnpordApi,
  AnpordClient
>() {}

export const layer = (options: ClientOptions) =>
  Layer.effect(AnpordApi, make(options)).pipe(
    Layer.provide(FetchHttpClient.layer)
  );
