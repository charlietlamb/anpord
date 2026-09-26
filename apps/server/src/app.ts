import { Auth } from "@anpord/auth";
import { AuthConfig } from "@anpord/auth/config";
import { logDatabase } from "@anpord/db/describe";
import { Effect, Layer } from "effect";
import { ServerConfig } from "./config";
import { listen } from "./http/listen";
import { routeRequest } from "./http/request/route-request";
import { AppLayer } from "./layer";
import { buildApiHandler } from "./routes/api-handler";
import { ApiLive } from "./routes/internal/api-layer";
import { PublicApiLive } from "./routes/public/api-layer";

const MAX_REQUEST_BODY_BYTES = 4 * 1024 * 1024;

const routesWith = (memoMap: Layer.MemoMap) =>
  Effect.gen(function* () {
    const auth = yield* Auth;
    const authConfig = yield* AuthConfig;

    return routeRequest({
      auth,
      internalApi: yield* buildApiHandler(ApiLive, memoMap),
      publicApi: yield* buildApiHandler(PublicApiLive, memoMap),
      trustedOrigins: authConfig.trustedOrigins,
    });
  });

const serve = (memoMap: Layer.MemoMap) =>
  Effect.gen(function* () {
    const config = yield* ServerConfig;
    const server = yield* listen(routesWith(memoMap), {
      drainTimeout: config.drainTimeout,
      hostname: config.host,
      maxRequestBodySize: MAX_REQUEST_BODY_BYTES,
      port: config.port,
    });

    yield* logDatabase;
    yield* Effect.logInfo(
      `server listening on http://${config.host}:${server.port}`
    );
    yield* Effect.never;
  });

export const main = Effect.gen(function* () {
  const memoMap = yield* Layer.makeMemoMap;
  const app = yield* Layer.buildWithMemoMap(
    AppLayer,
    memoMap,
    yield* Effect.scope
  );

  yield* Effect.provide(serve(memoMap), app);
}).pipe(Effect.scoped, Effect.tapErrorCause(Effect.logError));
