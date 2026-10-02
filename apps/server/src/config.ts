import { SERVER_PORT } from "@sphynx/schema/internal/local-ports";
import { Config, Context, Duration, Layer } from "effect";

export interface ServerConfigShape {
  readonly drainTimeout: Duration.Duration;
  readonly host: string;
  readonly port: number;
}

export class ServerConfig extends Context.Tag("@sphynx/server/ServerConfig")<
  ServerConfig,
  ServerConfigShape
>() {}

export const ServerConfigLive = Layer.effect(
  ServerConfig,
  Config.all({
    drainTimeout: Config.duration("SHUTDOWN_DRAIN_TIMEOUT").pipe(
      Config.withDefault(Duration.seconds(20))
    ),
    host: Config.string("HOST").pipe(Config.withDefault("127.0.0.1")),
    port: Config.integer("PORT").pipe(Config.withDefault(SERVER_PORT)),
  })
);
