import {
  GetPromptRequest,
  ListPromptsRequest,
  ListVersionsRequest,
  PromotePromptRequest,
  UpdatePromptRequest,
} from "@anpord/schema/public/requests";
import { Effect } from "effect";
import type { MCPServer } from "mcp-use";
import type { AnpordUser } from "./anpord-user";
import { callApi } from "./runtime";
import { toolInput } from "./tool-input";
import { asJson, text } from "./tool-output";

const ResolvePrompt = GetPromptRequest.pick("channel", "id", "version");

const AddVersion = UpdatePromptRequest.pick("content", "id", "message");

export const registerPromptTools = (server: MCPServer<AnpordUser>) => {
  server.tool(
    {
      description:
        "Read a prompt's content. Uses the organization's default channel " +
        "unless a channel or version is given.",
      inputSchema: toolInput(ResolvePrompt),
      name: "get_prompt",
    },
    (payload, ctx) =>
      callApi(ctx, (api) =>
        Effect.map(api.prompts.get({ payload }), (prompt) =>
          text(prompt.content)
        )
      )
  );

  server.tool(
    {
      description: "List every prompt you can see, without content.",
      inputSchema: toolInput(ListPromptsRequest),
      name: "list_prompts",
    },
    (payload, ctx) =>
      callApi(ctx, (api) =>
        Effect.map(api.prompts.list({ payload }), ({ data }) => asJson(data))
      )
  );

  server.tool(
    {
      description:
        "Show a prompt's version history: what changed, when, and why.",
      inputSchema: toolInput(ListVersionsRequest),
      name: "list_versions",
    },
    ({ id }, ctx) =>
      callApi(ctx, (api) =>
        Effect.map(
          api.prompts.get({ payload: { id, includeVersions: true } }),
          (prompt) => asJson(prompt.versions ?? [])
        )
      )
  );

  server.tool(
    {
      description:
        "Add a version to a prompt. Content is versioned, so this appends " +
        "rather than overwriting and earlier versions stay readable.",
      inputSchema: toolInput(AddVersion),
      name: "update_prompt",
    },
    (payload, ctx) =>
      callApi(ctx, (api) =>
        Effect.map(api.prompts.update({ payload }), (prompt) =>
          text(`${payload.id} is now v${prompt.version}`)
        )
      )
  );

  server.tool(
    {
      description:
        "Point a channel at a version. This is how a version goes live " +
        "without callers changing anything.",
      inputSchema: toolInput(PromotePromptRequest),
      name: "promote_prompt",
    },
    (payload, ctx) =>
      callApi(ctx, (api) =>
        Effect.as(
          api.prompts.promote({ payload }),
          text(`${payload.id} v${payload.version} is now ${payload.channel}`)
        )
      )
  );
};
