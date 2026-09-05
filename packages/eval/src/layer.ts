import { IdGeneratorLive } from "@anpord/ids/layer";
import { FetchHttpClient } from "@effect/platform";
import { Layer } from "effect";
import type { ConfigError } from "effect/ConfigError";
import { HarnessesLive } from "./adapters/harness/resolve";
import { ModelPricesLive } from "./adapters/models/prices";
import { SandboxAdaptersLive } from "./adapters/sandbox/resolve";
import { ScorerGroundTruthLive } from "./adapters/scorers/ground-truth";
import { GridRunLive } from "./grid/run";
import { type TrialRunner, TrialRunnerInProcess } from "./ports/trial-runner";
import { AbandonedWorkLive } from "./repositories/abandoned-work";
import { BaselineRepositoryLive } from "./repositories/baseline-repository";
import { EventRepositoryLive } from "./repositories/event-repository";
import { ExpiredRowsLive } from "./repositories/expired-rows";
import { HarnessProfileRepositoryLive } from "./repositories/harness-profile-repository";
import { JournalArchiveLive } from "./repositories/journal-archive";
import { LiveSandboxesLive } from "./repositories/live-sandboxes";
import { RunQueryLive } from "./repositories/run-query";
import { RunRepositoryLive } from "./repositories/run-repository";
import { TaskRepositoryLive } from "./repositories/task-repository";
import { TrialCostRepositoryLive } from "./repositories/trial-cost-repository";
import { TrialRecorderLive } from "./repositories/trial-record";
import { WorkbenchRepositoryLive } from "./repositories/workbench-repository";
import { AgentTrialLive } from "./services/agent-trial";
import { BaselinesLive } from "./services/baselines";
import { CellRerunsLive } from "./services/cell-rerun";
import { ExpirySweepScheduleLive } from "./services/expiry-sweep";
import { HarnessVersionsLive } from "./services/harness-versions";
import { JournalRetentionScheduleLive } from "./services/journal-retention";
import { layer as ModelCatalogueLive } from "./services/model-catalogue";
import { ReconcilerLive, ReconcilerScheduleLive } from "./services/reconciler";
import { SandboxProviderLive } from "./services/sandbox-provider";
import {
  SandboxReaperLive,
  SandboxReaperScheduleLive,
} from "./services/sandbox-reaper";
import { type Suspender, SuspenderSleeping } from "./services/suspender";
import { WorkbenchesLive } from "./services/workbench";

export const EvalRepositoriesLive = Layer.mergeAll(
  BaselineRepositoryLive,
  EventRepositoryLive,
  HarnessProfileRepositoryLive,
  RunQueryLive,
  RunRepositoryLive,
  TaskRepositoryLive,
  TrialCostRepositoryLive,
  TrialRecorderLive,
  WorkbenchRepositoryLive
).pipe(Layer.provide(IdGeneratorLive), Layer.provide(JournalArchiveLive));

export const EvalSandboxLive = SandboxProviderLive.pipe(
  Layer.provide(SandboxAdaptersLive)
);

const agentWith = (suspender: Layer.Layer<Suspender>) =>
  AgentTrialLive.pipe(
    Layer.provide(
      Layer.mergeAll(HarnessesLive, ScorerGroundTruthLive, suspender)
    )
  );

export const EvalBaselinesLive = BaselinesLive.pipe(
  Layer.provideMerge(EvalRepositoriesLive)
);

/* Prices are provided here rather than deeper, because this is the first
   place that knows a run is being executed for real: a trial is priced as it
   settles, and nothing below chooses where a rate comes from.

   The runner is not: where a run executes is a deployment decision, and this
   package cannot see the worker that answers it. The composition root passes
   one in. */
const gridWith = (runner: Layer.Layer<TrialRunner, ConfigError>) =>
  GridRunLive.pipe(
    Layer.provide(runner),
    Layer.provide(ModelPricesLive.pipe(Layer.provide(FetchHttpClient.layer))),
    Layer.provide(BaselinesLive),
    Layer.provideMerge(BaselinesLive)
  );

/**
 * @param runner where a dispatched run executes.
 * @param suspender how a wait is served. Sleeping holds the process, which is
 * what a server does; a durable runner passes one that suspends instead, and
 * stops paying for the wait.
 */
export const evalGridWith = (
  runner: Layer.Layer<TrialRunner, ConfigError>,
  suspender: Layer.Layer<Suspender> = SuspenderSleeping
) => {
  const grid = gridWith(runner);

  return Layer.mergeAll(
    grid,
    WorkbenchesLive.pipe(Layer.provide(grid)),

    CellRerunsLive.pipe(Layer.provide(grid))
  ).pipe(
    Layer.provide(agentWith(suspender)),
    Layer.provideMerge(EvalRepositoriesLive)
  );
};

/** The grid running trials in this process, which is what a worker itself
 * does once something else has handed it the run. */
export const EvalGridLive = evalGridWith(TrialRunnerInProcess);

export const EvalModelCatalogueLive = ModelCatalogueLive;
export const EvalHarnessVersionsLive = HarnessVersionsLive;

export const ReconcilerSweepLive = ReconcilerScheduleLive.pipe(
  Layer.provide(ReconcilerLive),
  Layer.provide(AbandonedWorkLive)
);

export const JournalRetentionSweepLive = JournalRetentionScheduleLive.pipe(
  Layer.provide(JournalArchiveLive)
);

/** Requires the sandbox provider and the credential resolver as well as the
 * database: reaping reaches the provider under the credentials a trial
 * opened its sandbox with. */
export const SandboxReaperSweepLive = SandboxReaperScheduleLive.pipe(
  Layer.provide(SandboxReaperLive),
  Layer.provide(LiveSandboxesLive)
);

export const ExpirySweepLive = ExpirySweepScheduleLive.pipe(
  Layer.provide(ExpiredRowsLive)
);
