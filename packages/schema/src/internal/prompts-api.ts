import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { Conflict, Forbidden, NotFound } from "../domain/errors";
import {
  AddVersionRequest,
  ChannelName,
  ChannelPlacement,
  CreatePromptRequest,
  LimitFromString,
  PromptId,
  PromptPage,
  PromptSortOrder,
  PromptStatusFilter,
  ResolvedPrompt,
  SetChannelRequest,
  UpdatePromptRequest,
  UpdateVersionRequest,
  VersionNumberFromString,
} from "../domain/prompts";
import { Authentication } from "./authentication";

const PromptPath = Schema.Struct({ id: PromptId });

const VersionPath = Schema.Struct({
  id: PromptId,
  version: VersionNumberFromString,
});

const ResolveQuery = Schema.Struct({
  channel: Schema.optional(ChannelName),
  version: Schema.optional(VersionNumberFromString),
});

const ListQuery = Schema.Struct({
  cursor: Schema.optional(Schema.String),
  limit: Schema.optional(LimitFromString),
  q: Schema.optional(Schema.String),
  sort: Schema.optional(PromptSortOrder),
  status: Schema.optional(PromptStatusFilter),
});

export class PromptsGroup extends HttpApiGroup.make("prompts")
  .add(
    HttpApiEndpoint.get("list", "/prompts")
      .setUrlParams(ListQuery)
      .addSuccess(PromptPage)
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
    HttpApiEndpoint.patch("updateVersion", "/prompts/:id/versions/:version")
      .setPath(VersionPath)
      .setPayload(UpdateVersionRequest)
      .addSuccess(ResolvedPrompt)
  )
  .add(
    HttpApiEndpoint.get("listChannels", "/prompts/:id/channels")
      .setPath(PromptPath)
      .addSuccess(Schema.Array(ChannelPlacement))
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
  .addError(Forbidden)
  .addError(NotFound)
  .middleware(Authentication) {}
