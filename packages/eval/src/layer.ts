import { IdGeneratorLive } from "@anpord/ids/layer";
import { Layer } from "effect";
import { GridRunLive } from "./grid/run";
import { CodexRunnerLive } from "./harness/codex";
import { SandboxAdaptersLive } from "./providers/resolve";
import { EventRepositoryLive } from "./repositories/event-repository";
import { RunQueryLive } from "./repositories/run-query";
import { RunRepositoryLive } from "./repositories/run-repository";
import { TaskRepositoryLive } from "./repositories/task-repository";
import { TrialRecorderLive } from "./repositories/trial-record";
import { WorkbenchRepositoryLive } from "./repositories/workbench-repository";
import { ScorerGroundTruthLive } from "./scorers/ground-truth";
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

/** The grid, wanting a Database and a SandboxProvider. */
export const EvalGridLive = Layer.mergeAll(
  GridRunLive,
  BaselinesLive,
  WorkbenchesLive.pipe(Layer.provide(GridRunLive))
).pipe(Layer.provide(AgentLive), Layer.provideMerge(EvalRepositoriesLive));

/** Sweeps abandoned work for the life of the process, opted into by the
 * composition root whose lifetime that is. Here the provide is real: nothing
 * encloses ReconcilerLive, so it satisfies the dependency and hides the tag. */
export const ReconcilerSweepLive = ReconcilerScheduleLive.pipe(
  Layer.provide(ReconcilerLive)
);
