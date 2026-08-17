import { Auth } from "@anpord/auth";
import { AuthConfig } from "@anpord/auth/config";
import { HttpApiBuilder } from "@effect/platform";
import { Effect, Layer, Schedule } from "effect";
import { ServerConfig } from "./config";
import { routeRequest } from "./http/request/route-request";
import { AppLayer } from "./layer";
import { ApiLive } from "./routes/internal/api-layer";
import { PublicApiLive } from "./routes/public/api-layer";

/** Four megabytes: far above any prompt a person writes, far below what would
 * threaten a small instance. */
const MAX_REQUEST_BODY_BYTES = 4 * 1024 * 1024;

export const main = Effect.gen(function* () {
  const memoMap = yield* Layer.makeMemoMap;
  const auth = yield* Auth;
  const config = yield* ServerConfig;
  const authConfig = yield* AuthConfig;

  const internalApi = yield* Effect.acquireRelease(
    Effect.sync(() => HttpApiBuilder.toWebHandler(ApiLive, { memoMap })),
    ({ dispose }) => Effect.promise(dispose)
  );

  const publicApi = yield* Effect.acquireRelease(
    Effect.sync(() => HttpApiBuilder.toWebHandler(PublicApiLive, { memoMap })),
    ({ dispose }) => Effect.promise(dispose)
  );

  const server = yield* Effect.acquireRelease(
    Effect.try({
      try: () =>
        Bun.serve({
          fetch: routeRequest({
            auth,
            internalApi,
            publicApi,
            trustedOrigins: authConfig.trustedOrigins,
          }),
          hostname: config.host,
          /** A prompt is text a person wrote, so a request larger than this is
           * a mistake or an attempt to exhaust the instance. Refusing it at the
           * socket keeps the body from being read into memory at all. */
          maxRequestBodySize: MAX_REQUEST_BODY_BYTES,
          port: config.port,
        }),
      catch: (cause) =>
        new Error(
          `Cannot bind ${config.host}:${config.port} — another process is using it. Run: lsof -ti:${config.port} | xargs kill`,
          { cause }
        ),
    }).pipe(
      Effect.retry(
        Schedule.exponential("120 millis").pipe(
          Schedule.compose(Schedule.recurs(6))
        )
      )
    ),
    (running) => Effect.sync(() => running.stop(true))
  );

  yield* Effect.logInfo(
    `server listening on http://${config.host}:${server.port}`
  );
  yield* Effect.never;
}).pipe(
  Effect.scoped,
  Effect.provide(AppLayer),
  Effect.tapErrorCause(Effect.logError)
);
