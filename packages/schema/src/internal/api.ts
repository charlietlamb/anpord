import { HttpApi } from "@effect/platform";
import { ActivityGroup } from "./activity-api";
import { ChannelsGroup } from "./channels-api";
import { CodebaseGroup } from "./codebase-api";
import { CredentialsGroup } from "./credentials-api";
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
  .add(CredentialsGroup)
  .add(CodebaseGroup)
  .add(EvalsGroup)
  .prefix("/api") {}
