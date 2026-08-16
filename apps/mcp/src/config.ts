import { Config, Effect, Option } from "effect";

const settings = Config.all({
  authUrl: Config.string("ANPORD_AUTH_URL").pipe(
    Config.withDefault("https://www.anpord.com/api/auth")
  ),
  baseUrl: Config.string("ANPORD_BASE_URL").pipe(
    Config.withDefault("https://api.anpord.com")
  ),
  port: Config.integer("PORT").pipe(Config.withDefault(3010)),
  resource: Config.string("MCP_RESOURCE_URL").pipe(Config.option),
});

const settled = Effect.runSync(settings);

export const { authUrl, baseUrl, port } = settled;

/**
 * A client rejects metadata whose resource is not the URL it connected to, so
 * the identifier follows the port the server actually listens on. Only a
 * deployment knows its public origin, which is what MCP_RESOURCE_URL names.
 */
export const resource = Option.getOrElse(
  settled.resource,
  () => `http://localhost:${port}/mcp`
);
