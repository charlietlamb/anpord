import { IdGeneratorLive } from "@anpord/ids/layer";
import { Layer } from "effect";
import { HarnessesLive } from "./adapters/harness/resolve";
import { SandboxAdaptersLive } from "./adapters/sandbox/resolve";
import { ScorerGroundTruthLive } from "./adapters/scorers/ground-truth";
import { GridRunLive } from "./grid/run";
import { EventRepositoryLive } from "./repositories/event-repository";
import { RunQueryLive } from "./repositories/run-query";
import { RunRepositoryLive } from "./repositories/run-repository";
import { TaskRepositoryLive } from "./repositories/task-repository";
import { TrialRecorderLive } from "./repositories/trial-record";
import { WorkbenchRepositoryLive } from "./repositories/workbench-repository";
import { AgentTrialLive } from "./services/agent-trial";
import { BaselinesLive } from "./services/baselines";
import { CellRerunsLive } from "./services/cell-rerun";
import { HarnessVersionsLive } from "./services/harness-versions";
import { layer as ModelCatalogueLive } from "./services/model-catalogue";
import { ReconcilerLive, ReconcilerScheduleLive } from "./services/reconciler";
import { SandboxProviderLive } from "./services/sandbox-provider";
import { WorkbenchesLive } from "./services/workbench";

export const EvalRepositoriesLive = Layer.mergeAll(
  EventRepositoryLive,
  RunQueryLive,
  RunRepositoryLive,
  TaskRepositoryLive,
  TrialRecorderLive,
  WorkbenchRepositoryLive
).pipe(Layer.provide(IdGeneratorLive));

export const EvalSandboxLive = SandboxProviderLive.pipe(
  Layer.provide(SandboxAdaptersLive)
);

const AgentLive = AgentTrialLive.pipe(
  Layer.provide(Layer.mergeAll(HarnessesLive, ScorerGroundTruthLive))
);

export const EvalBaselinesLive = BaselinesLive.pipe(
  Layer.provideMerge(EvalRepositoriesLive)
);

const GridWithBaselines = GridRunLive.pipe(
  Layer.provide(BaselinesLive),
  Layer.provideMerge(BaselinesLive)
);

export const EvalGridLive = Layer.mergeAll(
  GridWithBaselines,
  WorkbenchesLive.pipe(Layer.provide(GridWithBaselines)),

  CellRerunsLive.pipe(Layer.provide(GridWithBaselines))
).pipe(Layer.provide(AgentLive), Layer.provideMerge(EvalRepositoriesLive));

export const EvalModelCatalogueLive = ModelCatalogueLive;
export const EvalHarnessVersionsLive = HarnessVersionsLive;

export const ReconcilerSweepLive = ReconcilerScheduleLive.pipe(
  Layer.provide(ReconcilerLive)
);
