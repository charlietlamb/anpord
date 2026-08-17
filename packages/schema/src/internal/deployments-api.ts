import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { DeploymentPage } from "../domain/deployments";
import { Conflict, Forbidden, NotFound } from "../domain/errors";
import { ChannelName, LimitFromString, PromptId } from "../domain/prompts";
import { Authentication } from "./authentication";

const DeploymentQuery = Schema.Struct({
  channel: Schema.optional(ChannelName),
  cursor: Schema.optional(
    Schema.String.annotations({
      description:
        "The nextCursor of the page already read. Opaque, and only ever " +
        "returned by this endpoint.",
    })
  ),
  limit: Schema.optional(LimitFromString),
  prompt: Schema.optional(PromptId),
});

export class DeploymentsGroup extends HttpApiGroup.make("deployments")
  .add(
    HttpApiEndpoint.get("list", "/deployments")
      .setUrlParams(DeploymentQuery)
      .addSuccess(DeploymentPage)
  )
  .addError(Conflict)
  .addError(Forbidden)
  .addError(NotFound)
  .middleware(Authentication) {}
