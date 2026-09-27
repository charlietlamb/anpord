import {
  type HttpApi,
  HttpApiBuilder,
  HttpApp,
  type HttpRouter,
  HttpServerRequest,
} from "@effect/platform";
import { Effect, Layer } from "effect";

const logDefect = <E, R>(app: HttpApp.Default<E, R>) =>
  Effect.tapDefect(app, (defect) =>
    Effect.flatMap(HttpServerRequest.HttpServerRequest, (request) =>
      Effect.logError(`${request.method} ${request.url} failed`, defect)
    )
  );

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

    return {
      handler: HttpApp.toWebHandlerRuntime(runtime)(logDefect(app)),
    };
  });
