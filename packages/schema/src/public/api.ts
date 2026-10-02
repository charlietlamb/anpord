import { HttpApi, OpenApi } from "@effect/platform";
import { AuthGroup } from "./auth-api";
import { PublicConnectorsGroup } from "./connectors-api";
import {
  BatchesGroup,
  CasesGroup,
  ModelsGroup,
  RunsGroup,
  SuitesGroup,
} from "./evals-api";
import { API_ORIGIN } from "./origins";
import { PublicPromptsGroup } from "./prompts-api";
import { RunnerGroup } from "./runner-api";

export class PublicApi extends HttpApi.make("sphynx-public")
  .add(AuthGroup)
  .add(PublicConnectorsGroup)
  .add(BatchesGroup)
  .add(SuitesGroup)
  .add(CasesGroup)
  .add(RunsGroup)
  .add(ModelsGroup)
  .add(RunnerGroup)
  .add(PublicPromptsGroup)
  .prefix("/v1")
  .annotate(OpenApi.Title, "Sphynx API")
  .annotate(OpenApi.Version, "1.0.0")
  .annotate(
    OpenApi.Description,
    "Run agent evals and manage prompts. Every endpoint takes a JSON body " +
      "over POST and authenticates with a bearer API key."
  )
  .annotate(OpenApi.Servers, [
    { description: "Production", url: API_ORIGIN },
  ]) {}
