import { HttpApi, OpenApi } from "@effect/platform";
import { PublicPromptsGroup } from "./prompts-api";

/** Separate from `/api` so the dashboard can break freely and `/v1` cannot. */
export class PublicApi extends HttpApi.make("anpord-public")
  .add(PublicPromptsGroup)
  .prefix("/v1")
  .annotate(OpenApi.Title, "Anpord API")
  .annotate(OpenApi.Version, "1.0.0")
  .annotate(
    OpenApi.Description,
    "Prompt management. Every endpoint takes a JSON body over POST and " +
      "authenticates with a bearer API key."
  )
  .annotate(OpenApi.Servers, [
    { description: "Production", url: "https://api.anpord.com" },
  ]) {}
