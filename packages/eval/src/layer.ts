import { IdGeneratorLive } from "@anpord/ids/layer";
import { FetchHttpClient } from "@effect/platform";
import { Layer } from "effect";
import { HarnessesLive } from "./adapters/harness/resolve";
import { ModelPricesLive } from "./adapters/models/prices";
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
import { TrialRunnerInProcess } from "./services/in-process-runner";
import { layer as ModelCatalogueLive } from "./services/model-catalogue";
import { ReconcilerLive, ReconcilerScheduleLive } from "./services/reconciler";
import { SuspenderSleeping } from "./services/resumable-command";
import { ResumeRunsLive } from "./services/resume-run";
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
  Layer.provide(
    Layer.mergeAll(HarnessesLive, ScorerGroundTruthLive, SuspenderSleeping)
  )
);

export const EvalBaselinesLive = BaselinesLive.pipe(
  Layer.provideMerge(EvalRepositoriesLive)
);

/* Prices are provided here rather than deeper, because this is the first
   place that knows a run is being executed for real: a trial is priced as it
   settles, and nothing below chooses where a rate comes from. */
const GridWithBaselines = GridRunLive.pipe(
  Layer.provide(TrialRunnerInProcess),
  Layer.provide(ModelPricesLive.pipe(Layer.provide(FetchHttpClient.layer))),
  Layer.provide(BaselinesLive),
  Layer.provideMerge(BaselinesLive)
);

export const EvalGridLive = Layer.mergeAll(
  GridWithBaselines,
  WorkbenchesLive.pipe(Layer.provide(GridWithBaselines)),

  CellRerunsLive.pipe(Layer.provide(GridWithBaselines))
).pipe(Layer.provide(AgentLive), Layer.provideMerge(EvalRepositoriesLive));

export const EvalResumeLive = ResumeRunsLive;

export const EvalModelCatalogueLive = ModelCatalogueLive;
export const EvalHarnessVersionsLive = HarnessVersionsLive;

export const ReconcilerSweepLive = ReconcilerScheduleLive.pipe(
  Layer.provide(ReconcilerLive)
);
