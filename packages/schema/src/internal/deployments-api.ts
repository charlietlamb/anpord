import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { Deployment } from "../domain/deployments";
import { Forbidden } from "../domain/errors";
import { ChannelName, LimitFromString, PromptId } from "../domain/prompts";
import { Authentication } from "./authentication";

const DeploymentQuery = Schema.Struct({
  channel: Schema.optional(ChannelName),
  /** The timestamp of the last row already read. Keyset rather than a page
   * number, so a deployment made while someone reads cannot shift the page. */
  before: Schema.optional(Schema.DateTimeUtc),
  limit: Schema.optional(LimitFromString),
  prompt: Schema.optional(PromptId),
});

export class DeploymentsGroup extends HttpApiGroup.make("deployments")
  .add(
    HttpApiEndpoint.get("list", "/deployments")
      .setUrlParams(DeploymentQuery)
      .addSuccess(Schema.Array(Deployment))
  )
  .addError(Forbidden)
  .middleware(Authentication) {}
