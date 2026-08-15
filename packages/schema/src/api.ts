import { HttpApi } from "@effect/platform";
import { HealthGroup } from "./health-api";
import { OAuthGroup } from "./oauth-api";
import { PromptsGroup } from "./prompts-api";

/** Each surface is its own group; adding one is a single `.add` here. */
export class AnpordApi extends HttpApi.make("anpord")
  .add(HealthGroup)
  .add(OAuthGroup)
  .add(PromptsGroup)
  .prefix("/api") {}
