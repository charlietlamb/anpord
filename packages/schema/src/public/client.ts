import {
  FetchHttpClient,
  HttpApiClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { Effect, Layer, Redacted } from "effect";
import { PublicApi } from "./api";
import { withDeadlines } from "./deadlines";

export const DEFAULT_BASE_URL = "https://api.anpord.com";

export interface ClientOptions {
  readonly apiKey: Redacted.Redacted<string>;
  readonly baseUrl?: string;
}

export const make = ({ apiKey, baseUrl = DEFAULT_BASE_URL }: ClientOptions) =>
  Effect.flatMap(withDeadlines(baseUrl), (deadlines) =>
    HttpApiClient.make(PublicApi, {
      baseUrl,
      transformClient: (client) =>
        deadlines(client).pipe(
          HttpClient.mapRequest(
            HttpClientRequest.bearerToken(Redacted.value(apiKey))
          )
        ),
    })
  );

export type AnpordClient = Effect.Effect.Success<ReturnType<typeof make>>;

export class AnpordApi extends Effect.Tag("@anpord/sdk/AnpordApi")<
  AnpordApi,
  AnpordClient
>() {}

export const layer = (options: ClientOptions) =>
  Layer.effect(AnpordApi, make(options)).pipe(
    Layer.provide(FetchHttpClient.layer)
  );
