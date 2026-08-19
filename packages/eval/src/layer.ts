import { IdGeneratorLive } from "@anpord/ids/layer";
import { Layer } from "effect";
import { CodexRunnerLive } from "./harness/codex";
import { SandboxAdaptersLive } from "./providers/resolve";
import { EventRepositoryLive } from "./repositories/event-repository";
import { RunRepositoryLive } from "./repositories/run-repository";
import { TaskRepositoryLive } from "./repositories/task-repository";
import { TrialRepositoryLive } from "./repositories/trial-repository";
import { ScorerGroundTruthLive } from "./scoring/ground-truth";
import { AgentTrialLive } from "./services/agent-trial";
import { CellRunLive } from "./services/cell-run";
import { SandboxProviderLive } from "./services/sandbox-provider";

export const EvalRepositoriesLive = Layer.mergeAll(
  EventRepositoryLive,
  RunRepositoryLive,
  TaskRepositoryLive,
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
