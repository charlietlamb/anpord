import { HttpApi } from "@effect/platform";
import { ChannelsGroup } from "./channels-api";
import { DeploymentsGroup } from "./deployments-api";
import { EvalsGroup } from "./evals-api";
import { HealthGroup } from "./health-api";
import { OAuthGroup } from "./oauth-api";
import { PromptsGroup } from "./prompts-api";

export class AnpordApi extends HttpApi.make("anpord")
  .add(HealthGroup)
  .add(OAuthGroup)
  .add(PromptsGroup)
  .add(ChannelsGroup)
  .add(DeploymentsGroup)
  .add(EvalsGroup)
  .prefix("/api") {}
