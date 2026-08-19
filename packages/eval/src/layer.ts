import { IdGeneratorLive } from "@anpord/ids/layer";
import { Layer } from "effect";
import { SandboxAdaptersLive } from "./providers/resolve";
import { EventRepositoryLive } from "./repositories/event-repository";
import { RunRepositoryLive } from "./repositories/run-repository";
import { TaskRepositoryLive } from "./repositories/task-repository";
import { TrialRepositoryLive } from "./repositories/trial-repository";
import { SandboxProviderLive } from "./services/sandbox-provider";

export const EvalRepositoriesLive = Layer.mergeAll(
  EventRepositoryLive,
  RunRepositoryLive,
  TaskRepositoryLive,
  TrialRepositoryLive
).pipe(Layer.provide(IdGeneratorLive));

export const EvalSandboxLive = SandboxProviderLive.pipe(
  Layer.provide(SandboxAdaptersLive)
);
