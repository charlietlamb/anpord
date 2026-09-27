import {
  type HttpApi,
  HttpApiBuilder,
  HttpApp,
  type HttpRouter,
} from "@effect/platform";
import { Effect, Layer } from "effect";

export const buildApiHandler = <A, E>(
  api: Layer.Layer<A | HttpApi.Api | HttpRouter.HttpRouter.DefaultServices, E>,
  memoMap: Layer.MemoMap
) =>
  Effect.gen(function* () {
    const runtime = yield* Layer.toRuntimeWithMemoMap(
      Layer.mergeAll(
        api,
        HttpApiBuilder.Router.Live,
        HttpApiBuilder.Middleware.layer
      ),
      memoMap
    );
    const app = yield* Effect.provide(HttpApiBuilder.httpApp, runtime);

    return { handler: HttpApp.toWebHandlerRuntime(runtime)(app) };
  });
