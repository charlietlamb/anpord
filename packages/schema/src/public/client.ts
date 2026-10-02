import {
  FetchHttpClient,
  HttpApiClient,
  HttpClient,
  HttpClientRequest,
} from "@effect/platform";
import { Effect, Layer, Redacted } from "effect";
import { PublicApi } from "./api";
import { withDeadlines } from "./deadlines";
import { API_ORIGIN } from "./origins";

export interface ClientOptions {
  readonly apiKey: Redacted.Redacted<string>;
  readonly baseUrl?: string;
}

export const make = ({ apiKey, baseUrl = API_ORIGIN }: ClientOptions) =>
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

export type SphynxClient = Effect.Effect.Success<ReturnType<typeof make>>;

export class SphynxApi extends Effect.Tag("@sphynx/sdk/SphynxApi")<
  SphynxApi,
  SphynxClient
>() {}

export const layer = (options: ClientOptions) =>
  Layer.effect(SphynxApi, make(options)).pipe(
    Layer.provide(FetchHttpClient.layer)
  );
