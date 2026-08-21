import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { Conflict, Forbidden, NotFound } from "../domain/errors";
import { PromptActivityPage } from "../domain/prompt-activity";
import { PromptEventKind } from "../domain/prompt-events";
import { ChannelName, LimitFromString, PromptId } from "../domain/prompts";
import { Authentication } from "./authentication";

const ActivityQuery = Schema.Struct({
  channel: Schema.optional(ChannelName),
  cursor: Schema.optional(
    Schema.String.annotations({
      description:
        "The nextCursor of the page already read. Opaque, and only ever " +
        "returned by this endpoint.",
    })
  ),
  /** Narrows to one kind, which is how a deployment log is read out of the
   * history the whole organisation shares. */
  kind: Schema.optional(PromptEventKind),
  limit: Schema.optional(LimitFromString),
  prompt: Schema.optional(PromptId),
});

export class ActivityGroup extends HttpApiGroup.make("activity")
  .add(
    HttpApiEndpoint.get("list", "/activity")
      .setUrlParams(ActivityQuery)
      .addSuccess(PromptActivityPage)
  )
  .addError(Conflict)
  .addError(Forbidden)
  .addError(NotFound)
  .middleware(Authentication) {}
