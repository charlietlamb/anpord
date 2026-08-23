import { HttpApi, OpenApi } from "@effect/platform";
import { PublicEvalsGroup } from "./evals-api";
import { PublicPromptsGroup } from "./prompts-api";

export class PublicApi extends HttpApi.make("anpord-public")
  .add(PublicEvalsGroup)
  .add(PublicPromptsGroup)
  .prefix("/v1")
  .annotate(OpenApi.Title, "Anpord API")
  .annotate(OpenApi.Version, "1.0.0")
  .annotate(
    OpenApi.Description,
    "Run agent evals and manage prompts. Every endpoint takes a JSON body " +
      "over POST and authenticates with a bearer API key."
  )
  .annotate(OpenApi.Servers, [
    { description: "Production", url: "https://api.anpord.com" },
  ]) {}
