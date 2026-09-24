import { DatabaseLive } from "@anpord/db/client";
import { DatabaseConfigLive } from "@anpord/db/config";
import { RunBellTrigger } from "@anpord/eval/adapters/runner/trigger-bell";
import { SuspenderTrigger } from "@anpord/eval/adapters/runner/trigger-suspender";
import { evalStackWith } from "@anpord/eval/layer";
import { TrialRunnerInProcess } from "@anpord/eval/ports/trial-runner";
import { Layer } from "effect";

export const WorkerLayer = evalStackWith(TrialRunnerInProcess, {
  bell: RunBellTrigger,
  suspender: SuspenderTrigger,
}).pipe(Layer.provide(DatabaseLive.pipe(Layer.provide(DatabaseConfigLive))));
