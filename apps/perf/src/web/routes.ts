import type { SeededWorld } from "../seed/seed";

export interface WebRoute {
  readonly name: string;
  readonly path: (world: SeededWorld) => string;
}

export const largeTrialPath = (world: SeededWorld) =>
  `/evals/cases/${world.large.caseId}/trials/${world.large.trialId}`;

export const ROUTES: readonly WebRoute[] = [
  { name: "evals", path: () => "/evals" },
  { name: "batch", path: (world) => `/evals/${world.batches[0]?.id ?? ""}` },
  { name: "case", path: (world) => `/evals/cases/${world.cases[0] ?? ""}` },
  { name: "trial-large-journal", path: largeTrialPath },
  { name: "settings", path: () => "/settings" },
];
