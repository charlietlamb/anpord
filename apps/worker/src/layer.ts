import { DatabaseLive } from "@sphynx/db/client";
import { DatabaseConfigLive } from "@sphynx/db/config";
import { RunBellTrigger } from "@sphynx/eval/adapters/runner/trigger-bell";
import { SuspenderTrigger } from "@sphynx/eval/adapters/runner/trigger-suspender";
import { evalStackWith } from "@sphynx/eval/layer";
import { TrialRunnerInProcess } from "@sphynx/eval/ports/trial-runner";
import { Layer } from "effect";

export const WorkerLayer = evalStackWith(TrialRunnerInProcess, {
  bell: RunBellTrigger,
  suspender: SuspenderTrigger,
}).pipe(Layer.provide(DatabaseLive.pipe(Layer.provide(DatabaseConfigLive))));
