import { PublicApi } from "@anpord/schema/public/api";
import { Layer } from "effect";
import { ApiKeyAuthenticationLive } from "../../http/authentication/api-key-authentication";
import { apiSurface } from "../api-surface";
import { PublicConnectorsHandlers } from "./connectors/handlers";
import { BatchesHandlers } from "./evals/batches-handlers";
import { CasesHandlers } from "./evals/cases-handlers";
import { ModelsHandlers } from "./evals/models-handlers";
import { RunnerHandlers } from "./evals/runner-handlers";
import { RunsHandlers } from "./evals/runs-handlers";
import { PublicPromptsHandlers } from "./prompts/handlers";

export const PublicApiLive = apiSurface(
  PublicApi,
  Layer.mergeAll(
    PublicPromptsHandlers,
    PublicConnectorsHandlers,
    BatchesHandlers,
    CasesHandlers,
    RunsHandlers,
    ModelsHandlers,
    RunnerHandlers
  ),
  ApiKeyAuthenticationLive
);
