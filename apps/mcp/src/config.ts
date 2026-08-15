import { Config, Effect } from "effect";

const settings = Config.all({
  authUrl: Config.string("ANPORD_AUTH_URL").pipe(
    Config.withDefault("https://www.anpord.com/api/auth")
  ),
  baseUrl: Config.string("ANPORD_BASE_URL").pipe(
    Config.withDefault("https://api.anpord.com")
  ),
  port: Config.integer("PORT").pipe(Config.withDefault(3010)),
});

/**
 * Read once at startup rather than per request: mcp-use owns the lifecycle, so
 * there is no ambient runtime to yield from, and a malformed PORT should stop
 * the process instead of reaching listen() as NaN.
 */
export const { authUrl, baseUrl, port } = Effect.runSync(settings);
