import {
  localMcpResource,
  MCP_PORT,
} from "@anpord/schema/internal/local-ports";
import { API_ORIGIN, WEB_ORIGIN } from "@anpord/schema/public/origins";
import { Config, Effect, Option } from "effect";

const settings = Config.all({
  authUrl: Config.string("ANPORD_AUTH_URL").pipe(
    Config.withDefault(`${WEB_ORIGIN}/api/auth`)
  ),
  baseUrl: Config.string("ANPORD_BASE_URL").pipe(
    Config.withDefault(API_ORIGIN)
  ),
  port: Config.integer("PORT").pipe(Config.withDefault(MCP_PORT)),
  resource: Config.string("MCP_RESOURCE_URL").pipe(Config.option),
});

const settled = Effect.runSync(settings);

export const { authUrl, baseUrl, port } = settled;

/* A client rejects metadata whose resource is not the URL it connected to, so this follows the listening port unless MCP_RESOURCE_URL names the public origin. */
export const resource = Option.getOrElse(settled.resource, () =>
  localMcpResource(port)
);
