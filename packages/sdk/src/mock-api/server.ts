import { createServer } from "node:http";
import type { ApiCall } from "@anpord/schema/domain/api-mocks";
import { HttpRouter } from "@effect/platform";
import { make as makeHttpServer } from "@effect/platform-node/NodeHttpServer";
import { Effect, Ref } from "effect";
import { type ApiDefinition, api } from "./define";
import { ApiMockError } from "./errors";
import { requestHandler } from "./handler";

export const startApi = (
  definition: ApiDefinition,
  record: (call: ApiCall) => Effect.Effect<void, ApiMockError>
) =>
  Effect.gen(function* () {
    yield* Effect.try({
      try: () => api(definition),
      catch: () => new ApiMockError({ message: "Invalid API definition" }),
    });
    const sequence = yield* Ref.make(0);
    let router: HttpRouter.HttpRouter<ApiMockError> = HttpRouter.empty;
    for (const route of definition.endpoints) {
      router = HttpRouter.route(route.method)(
        router,
        route.path,
        requestHandler(definition, route, sequence, record)
      );
    }
    const server = yield* makeHttpServer(createServer, {
      host: "127.0.0.1",
      port: 0,
    }).pipe(
      Effect.mapError(
        () => new ApiMockError({ message: "Could not start local API server" })
      )
    );
    yield* server.serve(
      router.pipe(
        Effect.catchTag("RouteNotFound", () =>
          requestHandler(definition, undefined, sequence, record)
        )
      )
    );
    if (server.address._tag !== "TcpAddress") {
      return yield* new ApiMockError({
        message: "API server did not bind TCP",
      });
    }
    return {
      name: definition.name,
      url: `http://127.0.0.1:${server.address.port}`,
      endpoints: definition.endpoints.map(({ method, path, description }) => ({
        method,
        path,
        ...(description ? { description } : {}),
      })),
    };
  }).pipe(Effect.withSpan("ApiMock.start"));
