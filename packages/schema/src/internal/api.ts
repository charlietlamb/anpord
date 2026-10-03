import { HttpApi } from "@effect/platform";
import { ActivityGroup } from "./activity-api";
import { ChannelsGroup } from "./channels-api";
import { CodebaseGroup } from "./codebase-api";
import { EnvironmentGroup } from "./environment-api";
import { EvalsGroup } from "./evals-api";
import { HealthGroup } from "./health-api";
import { OAuthGroup } from "./oauth-api";
import { PromptsGroup } from "./prompts-api";

export class SphynxApi extends HttpApi.make("sphynx")
  .add(HealthGroup)
  .add(OAuthGroup)
  .add(PromptsGroup)
  .add(ChannelsGroup)
  .add(ActivityGroup)
  .add(EnvironmentGroup)
  .add(CodebaseGroup)
  .add(EvalsGroup)
  .prefix("/api") {}
