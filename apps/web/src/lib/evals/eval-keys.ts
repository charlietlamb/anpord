import type { EvalArtifactRequest } from "@anpord/schema/domain/evals";
import type { CaseFilters } from "@/lib/evals/evals-client";

export const evalKeys = {
  all: ["evals"] as const,
  caseLists: () => [...evalKeys.all, "cases"] as const,
  cases: (filters: CaseFilters, cursor: { readonly id: string } | null) =>
    [
      ...evalKeys.caseLists(),
      filters.q ?? "all",
      filters.sort,
      filters.order,
      filters.suite ?? "all",
      filters.tag ?? "all",
      cursor?.id ?? "first",
    ] as const,
  suiteLists: () => [...evalKeys.all, "suites"] as const,
  suites: (cursor: { readonly id: string } | null) =>
    [...evalKeys.suiteLists(), cursor?.id ?? "first"] as const,
  suite: (id: string) => [...evalKeys.all, "suite", id] as const,
  case: (id: string) => [...evalKeys.all, "case", id] as const,
  caseRuns: (caseId: string, variant: string | null, page: number) =>
    [...evalKeys.case(caseId), "runs", variant ?? "all", page] as const,
  run: (id: string) => [...evalKeys.all, "run", id] as const,
  batch: (id: string) => [...evalKeys.all, "batch", id] as const,
  tails: (batchId: string) => [...evalKeys.batch(batchId), "tail"] as const,
  tail: (batchId: string, runId: string) =>
    [...evalKeys.tails(batchId), runId] as const,
  subscription: (batchId: string) =>
    [...evalKeys.batch(batchId), "subscription"] as const,
  artifact: (request: EvalArtifactRequest) =>
    [
      ...evalKeys.all,
      "artifact",
      request.trialId,
      request.path,
      request.sha256,
    ] as const,
  trialAddress: (id: string) => [...evalKeys.all, "trial-address", id] as const,
} as const;
