import { RerunCellRequest } from "@anpord/schema/domain/evals";
import { PROFILE_HARNESS_RULE } from "@anpord/schema/domain/harness-profile";
import {
  EvalCellRequest,
  EvalModelsRequest,
  EvalRunRequest,
  ListEvalsRequest,
  PublicStartEvalRequest,
} from "@anpord/schema/public/evals-api";
import {
  GetPromptRequest,
  ListPromptsRequest,
  ListVersionsRequest,
  PromotePromptRequest,
  UpdatePromptRequest,
} from "@anpord/schema/public/requests";
import { Effect, Schema } from "effect";
import type { MCPServer } from "mcp-use";
import { callApi } from "./runtime";
import { toolInput } from "./tool-input";

export interface AnpordUser {
  readonly email?: string;
  readonly id: string;
  readonly name?: string;
  readonly roles: string[];
}

const text = (value: string) => ({
  content: [{ text: value, type: "text" as const }],
});

const asJson = (value: unknown) => text(JSON.stringify(value, null, 2));

const ResolvePrompt = GetPromptRequest.pick("channel", "id", "version");

const AddVersion = UpdatePromptRequest.pick("content", "id", "message");

const RerunCell = Schema.Struct({
  ...EvalRunRequest.fields,
  ...EvalCellRequest.fields,
  ...RerunCellRequest.fields,
});

export const register = (server: MCPServer<AnpordUser>) => {
  server.tool(
    {
      description: "List a page of eval runs, newest first.",
      inputSchema: toolInput(ListEvalsRequest),
      name: "list_eval_runs",
    },
    (payload, ctx) =>
      callApi(ctx, (api) => Effect.map(api.evals.list({ payload }), asJson))
  );

  server.tool(
    {
      description:
        "List the models available to a harness. The command harness has no catalogue and returns an empty list.",
      inputSchema: toolInput(EvalModelsRequest),
      name: "list_eval_models",
    },
    (payload, ctx) =>
      callApi(ctx, (api) => Effect.map(api.evals.models({ payload }), asJson))
  );

  server.tool(
    {
      description:
        "Start an eval run. Returns an id while trials continue in the background. " +
        "A task may carry a profile: files under home/ or workspace/, a system prompt and env. " +
        PROFILE_HARNESS_RULE,
      inputSchema: toolInput(PublicStartEvalRequest),
      name: "start_eval_run",
    },
    (payload, ctx) =>
      callApi(ctx, (api) => Effect.map(api.evals.start({ payload }), asJson))
  );

  server.tool(
    {
      description: "Get an eval run, including its cells and trial results.",
      inputSchema: toolInput(EvalRunRequest),
      name: "get_eval_run",
    },
    (payload, ctx) =>
      callApi(ctx, (api) => Effect.map(api.evals.get({ payload }), asJson))
  );

  server.tool(
    {
      description: "List previous results for an eval cell.",
      inputSchema: toolInput(EvalCellRequest),
      name: "get_eval_cell_history",
    },
    (payload, ctx) =>
      callApi(ctx, (api) =>
        Effect.map(api.evals.cellHistory({ payload }), asJson)
      )
  );

  server.tool(
    {
      description: "Run one cell again with the same case and variant.",
      inputSchema: toolInput(RerunCell),
      name: "rerun_eval_cell",
    },
    (payload, ctx) =>
      callApi(ctx, (api) =>
        Effect.map(api.evals.rerunCell({ payload }), asJson)
      )
  );

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
