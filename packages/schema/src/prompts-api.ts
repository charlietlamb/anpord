import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { Authentication } from "./authentication";
import { Conflict, NotFound } from "./errors";
import {
  AddVersionRequest,
  ChannelName,
  CreatePromptRequest,
  PromptId,
  PromptSummary,
  ResolvedPrompt,
  SetChannelRequest,
  UpdatePromptRequest,
  VersionNumberFromString,
} from "./prompts";

const PromptPath = Schema.Struct({ id: PromptId });

const ResolveQuery = Schema.Struct({
  channel: Schema.optional(ChannelName),
  version: Schema.optional(VersionNumberFromString),
});

export class PromptsGroup extends HttpApiGroup.make("prompts")
  .add(
    HttpApiEndpoint.get("list", "/prompts").addSuccess(
      Schema.Array(PromptSummary)
    )
  )
  .add(
    HttpApiEndpoint.post("create", "/prompts")
      .setPayload(CreatePromptRequest)
      .addSuccess(ResolvedPrompt)
  )
  .add(
    HttpApiEndpoint.get("get", "/prompts/:id")
      .setPath(PromptPath)
      .setUrlParams(ResolveQuery)
      .addSuccess(ResolvedPrompt)
  )
  .add(
    HttpApiEndpoint.post("addVersion", "/prompts/:id/versions")
      .setPath(PromptPath)
      .setPayload(AddVersionRequest)
      .addSuccess(ResolvedPrompt)
  )
  .add(
    HttpApiEndpoint.get("listVersions", "/prompts/:id/versions")
      .setPath(PromptPath)
      .addSuccess(Schema.Array(ResolvedPrompt))
  )
  .add(
    HttpApiEndpoint.put("setChannel", "/prompts/:id/channels")
      .setPath(PromptPath)
      .setPayload(SetChannelRequest)
      .addSuccess(Schema.Void)
  )
  .add(
    HttpApiEndpoint.patch("update", "/prompts/:id")
      .setPath(PromptPath)
      .setPayload(UpdatePromptRequest)
      .addSuccess(Schema.Void)
  )
  .add(
    HttpApiEndpoint.del("archive", "/prompts/:id")
      .setPath(PromptPath)
      .addSuccess(Schema.Void)
  )
  .addError(Conflict)
  .addError(NotFound)
  .middleware(Authentication) {}
