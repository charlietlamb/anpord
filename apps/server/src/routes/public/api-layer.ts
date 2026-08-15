import { PublicApi } from "@anpord/schema/public/api";
import {
  HttpApiBuilder,
  HttpServer as PlatformHttpServer,
} from "@effect/platform";
import { Layer } from "effect";
import { ApiKeyAuthenticationLive } from "../../http/api-key-authentication";
import { AppLayer } from "../../layer";
import { PublicPromptsHandlers } from "./prompts-handlers";

export const PublicApiLive = Layer.mergeAll(
  HttpApiBuilder.api(PublicApi).pipe(
    Layer.provide(PublicPromptsHandlers),
    Layer.provide(ApiKeyAuthenticationLive),
    Layer.provide(AppLayer)
  ),
  PlatformHttpServer.layerContext
);
