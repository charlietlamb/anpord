export type {
  CatalogueModel,
  EvalCell,
  EvalCellHistoryEntry,
  EvalComparison,
  EvalDistribution,
  EvalHarness,
  EvalJournalEntry,
  EvalProvider,
  EvalRun,
  EvalRunStatus,
  EvalRunSummary,
  EvalSource,
  EvalTask,
  EvalTrial,
  EvalTrialStatus,
  EvalUsage,
  EvalVerdict,
  ModelCatalogue,
  RerunCellRequest,
  StartedEval,
} from "@anpord/schema/domain/evals";
export type { AnpordClient, ClientOptions } from "@anpord/schema/public/client";
export {
  AnpordApi,
  DEFAULT_BASE_URL,
  layer,
  make,
} from "@anpord/schema/public/client";

import type { EvalsSurface as PublicEvalsSurface } from "./client/anpord";
export type StartEvalRequest = Parameters<PublicEvalsSurface["start"]>[0];
export type EvalCase = StartEvalRequest["cases"][number];
export type EvalTaskRequest = StartEvalRequest["tasks"][number];
export type {
  PublicPrompt,
  PublicPromptSummary,
  PublicPromptWithVersions,
  PublicVersion,
} from "@anpord/schema/public/shapes";
export {
  Anpord,
  type AnpordOptions,
  type EvalsSurface,
  type PromptResult,
  type PromptsSurface,
} from "./client/anpord";
export type { CacheOptions } from "./client/cache/settings";
export type {
  GetPromptOptions,
  PromptFallback,
  PromptMetadata,
} from "./client/cache/types";
export { AnpordError, MissingApiKey } from "./client/errors";
export type { AnpordPromptVariables } from "./client/variables";
