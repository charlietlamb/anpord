import { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import { EvalCaseId } from "@anpord/schema/domain/eval-limits";
import { PROFILE_HARNESS_RULE } from "@anpord/schema/domain/harness-profile";
import { RunCaseRequest } from "@anpord/schema/domain/run-case";
import {
  ById,
  ListBatchesRequest,
  ListCasesRequest,
  ListModelsRequest,
  ListRunsRequest,
} from "@anpord/schema/public/evals-api";
import { Effect, Schema } from "effect";
import type { MCPServer } from "mcp-use";
import type { AnpordUser } from "./anpord-user";
import { callApi } from "./runtime";
import { toolInput } from "./tool-input";
import { asJson } from "./tool-output";

const StartSuite = StartBatchRequest.omit("local", "trigger");

const StartCase = Schema.Struct({ id: EvalCaseId, ...RunCaseRequest.fields });

export const registerEvalTools = (server: MCPServer<AnpordUser>) => {
  server.tool(
    {
      description:
        "Start a batch that runs every case of a suite on every variant. Returns the batch id and one run id per case and variant while trials continue in the background. " +
        "A variant may carry a profile: files under home/ or workspace/, a system prompt and env. " +
        PROFILE_HARNESS_RULE,
      inputSchema: toolInput(StartSuite),
      name: "start_suite_batch",
    },
    (payload, ctx) =>
      callApi(ctx, (api) => Effect.map(api.batches.start({ payload }), asJson))
  );

  server.tool(
    {
      description:
        "Start a batch that runs a stored case's newest version on the variant ids named, or on every variant it has run on when none are. Trials default to 1.",
      inputSchema: toolInput(StartCase),
      name: "start_case_batch",
    },
    (payload, ctx) =>
      callApi(ctx, (api) => Effect.map(api.cases.run({ payload }), asJson))
  );

  server.tool(
    {
      description: "Get a batch, with each run and its trial results.",
      inputSchema: toolInput(ById),
      name: "get_batch",
    },
    (payload, ctx) =>
      callApi(ctx, (api) => Effect.map(api.batches.get({ payload }), asJson))
  );

  server.tool(
    {
      description:
        "List a page of batches, newest first. A batch is the runs started together.",
      inputSchema: toolInput(ListBatchesRequest),
      name: "list_batches",
    },
    (payload, ctx) =>
      callApi(ctx, (api) => Effect.map(api.batches.list({ payload }), asJson))
  );

  server.tool(
    {
      description:
        "List a page of cases, optionally in one suite or with one tag.",
      inputSchema: toolInput(ListCasesRequest),
      name: "list_cases",
    },
    (payload, ctx) =>
      callApi(ctx, (api) => Effect.map(api.cases.list({ payload }), asJson))
  );

  server.tool(
    {
      description:
        "Get a case, its versions and each variant it has run on, with the variant ids start_case_batch takes.",
      inputSchema: toolInput(ById),
      name: "get_case",
    },
    (payload, ctx) =>
      callApi(ctx, (api) => Effect.map(api.cases.get({ payload }), asJson))
  );

  server.tool(
    {
      description:
        "List a case's runs, newest first, optionally on one of its variants.",
      inputSchema: toolInput(ListRunsRequest),
      name: "list_runs",
    },
    (payload, ctx) =>
      callApi(ctx, (api) => Effect.map(api.runs.list({ payload }), asJson))
  );

  server.tool(
    {
      description: "Get a run, one case on one variant, with its trials.",
      inputSchema: toolInput(ById),
      name: "get_run",
    },
    (payload, ctx) =>
      callApi(ctx, (api) => Effect.map(api.runs.get({ payload }), asJson))
  );

  server.tool(
    {
      description:
        "List the models available to a harness. The command harness has no catalogue and returns an empty list.",
      inputSchema: toolInput(ListModelsRequest),
      name: "list_models",
    },
    (payload, ctx) =>
      callApi(ctx, (api) => Effect.map(api.models.list({ payload }), asJson))
  );
};
