import { AuthLive } from "@anpord/auth";
import { AuthConfigLive } from "@anpord/auth/config";
import { CacheConfigLive } from "@anpord/cache/config";
import { CacheLive } from "@anpord/cache/layer";
import { DatabaseLive } from "@anpord/db/client";
import { DatabaseConfigLive } from "@anpord/db/config";
import { PromptsLayer } from "@anpord/prompts/layer";
import { Layer } from "effect";
import { ServerConfigLive } from "./config";

const DatabaseLayer = DatabaseLive.pipe(Layer.provide(DatabaseConfigLive));
const CacheLayer = CacheLive.pipe(Layer.provide(CacheConfigLive));

const AuthLayer = AuthLive.pipe(
  Layer.provide(Layer.mergeAll(AuthConfigLive, DatabaseLayer))
);

const PromptsServiceLayer = PromptsLayer.pipe(
  Layer.provide(Layer.mergeAll(DatabaseLayer, CacheLayer))
);

/** Every dependency the request path needs, composed once. */
export const AppLayer = Layer.mergeAll(
  ServerConfigLive,
  AuthLayer,
  DatabaseLayer,
  PromptsServiceLayer
);
