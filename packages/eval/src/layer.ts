import { IdGeneratorLive } from "@anpord/ids/layer";
import { Layer } from "effect";
import { CodexRunnerLive } from "./harness/codex";
import { SandboxAdaptersLive } from "./providers/resolve";
import { EventRepositoryLive } from "./repositories/event-repository";
import { RunQueryLive } from "./repositories/run-query";
import { RunRepositoryLive } from "./repositories/run-repository";
import { TaskRepositoryLive } from "./repositories/task-repository";
import { TrialRecorderLive } from "./repositories/trial-record";
import { TrialRepositoryLive } from "./repositories/trial-repository";
import { ScorerGroundTruthLive } from "./scoring/ground-truth";
import { AgentTrialLive } from "./services/agent-trial";
import { BaselinesLive } from "./services/baselines";
import { CellRunLive } from "./services/cell-run";
import { SandboxProviderLive } from "./services/sandbox-provider";

export const EvalRepositoriesLive = Layer.mergeAll(
  EventRepositoryLive,
  RunQueryLive,
  RunRepositoryLive,
  TaskRepositoryLive,
  TrialRecorderLive,
  TrialRepositoryLive
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

/** The whole domain, wanting only a Database and a SandboxProvider from its
 * caller. Those two are what a composition root chooses: one because a test
 * points at a different server, the other because a trial needs credentials
 * the domain has no business holding. */
export const EvalLayer = CellRunLive.pipe(
  Layer.provide(AgentLive),
  /* provideMerge rather than provide: the repositories are part of what this
     package offers, not only what CellRun happens to need, and a caller
     reading a run back should not have to build them a second time. */
  Layer.provideMerge(EvalRepositoriesLive)
);
