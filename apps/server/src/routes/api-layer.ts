import { AnpordApi } from "@anpord/schema/api";
import {
  HttpApiBuilder,
  HttpServer as PlatformHttpServer,
} from "@effect/platform";
import { Layer } from "effect";
import { AuthenticationLive } from "../http/authentication";
import { AppLayer } from "../layer";
import { HealthHandlers } from "./health-handlers";
import { OAuthHandlers } from "./oauth-handlers";
import { PromptsHandlers } from "./prompts-handlers";

/** New surfaces join here; nothing else in the server needs to change. */
const GroupsLive = Layer.mergeAll(
  HealthHandlers,
  OAuthHandlers,
  PromptsHandlers
);

export const ApiLive = Layer.mergeAll(
  HttpApiBuilder.api(AnpordApi).pipe(
    Layer.provide(GroupsLive),
    Layer.provide(AuthenticationLive),
    Layer.provide(AppLayer)
  ),
  PlatformHttpServer.layerContext
);
