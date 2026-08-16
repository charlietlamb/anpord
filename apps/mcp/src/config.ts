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

export const { authUrl, baseUrl, port } = Effect.runSync(settings);
