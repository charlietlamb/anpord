import {
  type HttpApi,
  HttpApiBuilder,
  type HttpApiGroup,
  HttpServer as PlatformHttpServer,
} from "@effect/platform";
import { Layer } from "effect";
import { AppLayer } from "../layer";

export const apiSurface = <
  Id extends string,
  Groups extends HttpApiGroup.HttpApiGroup.Any,
  E,
  R,
  HandlerOut,
  HandlerIn,
  AuthOut,
  AuthIn,
>(
  api: HttpApi.HttpApi<Id, Groups, E, R>,
  handlers: Layer.Layer<HandlerOut, never, HandlerIn>,
  authentication: Layer.Layer<AuthOut, never, AuthIn>
) =>
  Layer.mergeAll(
    HttpApiBuilder.api(api).pipe(
      Layer.provide(handlers),
      Layer.provide(authentication),
      Layer.provide(AppLayer)
    ),
    PlatformHttpServer.layerContext
  );
