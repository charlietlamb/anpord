import { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import { PROFILE_HARNESS_RULE } from "@anpord/schema/domain/harness-profile";
import { RunCaseRequest } from "@anpord/schema/domain/run-case";
import {
  CaseRunsRequest,
  EvalBatchRequest,
  EvalModelsRequest,
  ListBatchesRequest,
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

const decodeJson = (value: unknown) => text(JSON.stringify(value, null, 2));

const ResolvePrompt = GetPromptRequest.pick("channel", "id", "version");

const AddVersion = UpdatePromptRequest.pick("content", "id", "message");

const RunCase = Schema.Struct({
  caseId: CaseRunsRequest.fields.caseId,
  ...RunCaseRequest.fields,
});

export const register = (server: MCPServer<AnpordUser>) => {
  server.tool(
    {
      description:
        "List a page of eval batches, newest first. A batch is the runs started together.",
      inputSchema: toolInput(ListBatchesRequest),
      name: "list_eval_batches",
    },
    (payload, ctx) =>
      callApi(ctx, (api) => Effect.map(api.evals.list({ payload }), decodeJson))
  );

  server.tool(
    {
      description:
        "List the models available to a harness. The command harness has no catalogue and returns an empty list.",
      inputSchema: toolInput(EvalModelsRequest),
      name: "list_eval_models",
    },
    (payload, ctx) =>
      callApi(ctx, (api) =>
        Effect.map(api.evals.models({ payload }), decodeJson)
      )
  );

  server.tool(
    {
      description:
        "Run every case of a suite on every variant. Returns the batch id and one run id per case and variant while trials continue in the background. " +
        "A variant may carry a profile: files under home/ or workspace/, a system prompt and env. " +
        PROFILE_HARNESS_RULE,
      inputSchema: toolInput(StartBatchRequest.omit("local", "trigger")),
      name: "start_eval_batch",
    },
    (payload, ctx) =>
      callApi(ctx, (api) =>
        Effect.map(
          api.evals.start({
            payload: { ...payload, local: false, trigger: { source: "mcp" } },
          }),
          decodeJson
        )
      )
  );

  server.tool(
    {
      description:
        "Get an eval batch, including each run and its trial results.",
      inputSchema: toolInput(EvalBatchRequest),
      name: "get_eval_batch",
    },
    (payload, ctx) =>
      callApi(ctx, (api) => Effect.map(api.evals.get({ payload }), decodeJson))
  );

  server.tool(
    {
      description:
        "List a case's runs, newest first, optionally on one of its variants.",
      inputSchema: toolInput(CaseRunsRequest),
      name: "list_case_runs",
    },
    (payload, ctx) =>
      callApi(ctx, (api) =>
        Effect.map(api.evals.caseRuns({ payload }), decodeJson)
      )
  );

  server.tool(
    {
      description:
        "Run a case's newest version again on one of its variants, or on every variant when none is named.",
      inputSchema: toolInput(RunCase),
      name: "run_eval_case",
    },
    (payload, ctx) =>
      callApi(ctx, (api) =>
        Effect.map(api.evals.runCase({ payload }), decodeJson)
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
        Effect.map(api.prompts.list({ payload }), ({ data }) =>
          decodeJson(data)
        )
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
          (prompt) => decodeJson(prompt.versions ?? [])
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
