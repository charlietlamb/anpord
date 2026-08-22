import { IdGeneratorLive } from "@anpord/ids/layer";
import { Layer } from "effect";
import { CodexRunnerLive } from "./adapters/harness/codex";
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

/** The sandbox seam on its own, so a caller that only runs trials does not
 * drag a database in behind it. */
export const EvalSandboxLive = SandboxProviderLive.pipe(
  Layer.provide(SandboxAdaptersLive)
);

const AgentLive = AgentTrialLive.pipe(
  Layer.provide(Layer.mergeAll(CodexRunnerLive, ScorerGroundTruthLive))
);

/** Baselines read through RunQuery, so they compose after the repositories
 * rather than beside them. provideMerge because a caller comparing a run
 * usually writes one too, and hiding the repositories here would make it
 * build them a second time. */
export const EvalBaselinesLive = BaselinesLive.pipe(
  Layer.provideMerge(EvalRepositoriesLive)
);

/** The grid, wanting a Database and a SandboxProvider.
 *
 * Baselines is provided into the grid rather than merged beside it: a cell
 * promotes its first scored reading as it completes, so the grid depends on
 * the service. provideMerge keeps the tag visible to callers that compare a
 * run after starting one. */
const GridWithBaselines = GridRunLive.pipe(
  Layer.provide(BaselinesLive),
  Layer.provideMerge(BaselinesLive)
);

export const EvalGridLive = Layer.mergeAll(
  GridWithBaselines,
  WorkbenchesLive.pipe(Layer.provide(GridWithBaselines))
).pipe(Layer.provide(AgentLive), Layer.provideMerge(EvalRepositoriesLive));

/** Sweeps abandoned work for the life of the process, opted into by the
 * composition root whose lifetime that is. Here the provide is real: nothing
 * encloses ReconcilerLive, so it satisfies the dependency and hides the tag. */
export const ReconcilerSweepLive = ReconcilerScheduleLive.pipe(
  Layer.provide(ReconcilerLive)
);
