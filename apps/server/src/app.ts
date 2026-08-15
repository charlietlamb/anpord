import { Auth } from "@anpord/auth";
import { HttpApiBuilder } from "@effect/platform";
import { Effect, Layer, Schedule } from "effect";
import { ServerConfig } from "./config";
import { isAuthorizeRoute, withConsentPrompt } from "./http/require-consent";
import { isDiscoveryRoute, toAuthRequest } from "./http/well-known";
import { AppLayer } from "./layer";
import { ApiLive } from "./routes/api-layer";
import { PublicApiLive } from "./routes/public/api-layer";

const isAuthRoute = (pathname: string) =>
  pathname === "/api/auth" || pathname.startsWith("/api/auth/");

const isPublicRoute = (pathname: string) => pathname.startsWith("/v1/");

export const main = Effect.gen(function* () {
  const memoMap = yield* Layer.makeMemoMap;
  const auth = yield* Auth;
  const config = yield* ServerConfig;

  const api = yield* Effect.acquireRelease(
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
          hostname: config.host,
          port: config.port,
          fetch: (request) => {
            const { pathname } = new URL(request.url);
            if (isDiscoveryRoute(pathname)) {
              return auth.handler(toAuthRequest(request));
            }
            if (isAuthorizeRoute(pathname)) {
              return auth.handler(withConsentPrompt(request));
            }
            if (isAuthRoute(pathname)) {
              return auth.handler(request);
            }
            return isPublicRoute(pathname)
              ? publicApi.handler(request)
              : api.handler(request);
          },
        }),
      /**
       * A stale process holding the port is the usual cause, and Bun's raw
       * error does not say which port. Turbo tears down every dev task when one
       * exits, so the web server dies with it — name the fix in the message.
       */
      catch: (cause) =>
        new Error(
          `Cannot bind ${config.host}:${config.port} — another process is using it. Run: lsof -ti:${config.port} | xargs kill`,
          { cause }
        ),
    }).pipe(
      /**
       * On restart the previous process may still hold the port for a moment,
       * so a few quick retries beat failing and taking every sibling dev task
       * down with us.
       */
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
