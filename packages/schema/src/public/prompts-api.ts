import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";
import { BadRequest, Conflict, Forbidden, NotFound } from "../domain/errors";
import { ApiKeyAuthentication } from "./authentication";
import {
  CreatePromptRequest,
  GetPromptRequest,
  ListPromptsRequest,
  Ok,
  PromotePromptRequest,
  UpdatePromptRequest,
} from "./requests";
import { PromptList, PublicPromptWithVersions } from "./shapes";

export class PublicPromptsGroup extends HttpApiGroup.make("prompts")
  .add(
    HttpApiEndpoint.post("get", "/prompts.get")
      .setPayload(GetPromptRequest)
      .addSuccess(PublicPromptWithVersions)
      .annotate(OpenApi.Summary, "Resolve a prompt")
      .annotate(
        OpenApi.Description,
        "Returns the content a caller should send to a model. With no " +
          "selector this follows the organization's default channel."
      )
  )
  .add(
    HttpApiEndpoint.post("list", "/prompts.list")
      .setPayload(ListPromptsRequest)
      .addSuccess(PromptList)
      .annotate(OpenApi.Summary, "List prompts")
      .annotate(
        OpenApi.Description,
        "Up to 100 prompts in the organization, without content."
      )
  )
  .add(
    HttpApiEndpoint.post("create", "/prompts.create")
      .setPayload(CreatePromptRequest)
      .addSuccess(PublicPromptWithVersions)
      .annotate(OpenApi.Summary, "Create a prompt")
      .annotate(
        OpenApi.Description,
        "Creates the prompt and its first version in one call."
      )
  )
  .add(
    HttpApiEndpoint.post("update", "/prompts.update")
      .setPayload(UpdatePromptRequest)
      .addSuccess(PublicPromptWithVersions)
      .annotate(OpenApi.Summary, "Add a version")
      .annotate(
        OpenApi.Description,
        "Content is versioned, so updating a prompt appends a version rather " +
          "than overwriting one. Earlier versions stay readable."
      )
  )
  .add(
    HttpApiEndpoint.post("promote", "/prompts.promote")
      .setPayload(PromotePromptRequest)
      .addSuccess(Ok)
      .annotate(OpenApi.Summary, "Promote a version to a channel")
      .annotate(
        OpenApi.Description,
        "Points a channel, such as production, at a version. This is how a " +
          "version goes live without callers changing anything."
      )
  )
  .addError(BadRequest)
  .addError(Forbidden)
  .addError(Conflict)
  .addError(NotFound)
  .middleware(ApiKeyAuthentication)
  .annotate(OpenApi.Title, "Prompts")
  .annotate(
    OpenApi.Description,
    "Read and write prompts. Content is versioned, so writes append rather " +
      "than overwrite, and channels decide which version callers receive."
  ) {}
