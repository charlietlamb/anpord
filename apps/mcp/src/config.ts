import { Config, Effect } from "effect";

const settings = Config.all({
  authUrl: Config.string("ANPORD_AUTH_URL").pipe(
    Config.withDefault("https://www.anpord.com/api/auth")
  ),
  baseUrl: Config.string("ANPORD_BASE_URL").pipe(
    Config.withDefault("https://api.anpord.com")
  ),
  port: Config.integer("PORT").pipe(Config.withDefault(3010)),
  resource: Config.string("MCP_RESOURCE_URL").pipe(
    Config.withDefault("https://mcp.anpord.com/mcp")
  ),
});

export const { authUrl, baseUrl, port, resource } = Effect.runSync(settings);
