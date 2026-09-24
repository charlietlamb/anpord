import type { StartedBatch } from "@anpord/schema/domain/evals";
import { Effect } from "effect";
import {
  formatBatchSummary,
  type ProgressMode,
  watchBatch,
} from "./batch-progress";
import { waitForBatch } from "./batch-wait";
import { batchError, type EvalGate, problemsWith } from "./eval-gate";
import { attended, json, note } from "./render";

export interface HostedOptions {
  readonly gate: EvalGate;
  readonly skipWait: boolean;
  readonly timeoutSeconds: number;
  readonly wantsJson: boolean;
}

const progressModeOf = (wantsJson: boolean, live: boolean): ProgressMode => {
  if (wantsJson) {
    return "silent";
  }

  return live ? "live" : "lines";
};

export const settleBatch = (
  started: StartedBatch,
  trials: number,
  options: HostedOptions
) =>
  Effect.gen(function* () {
    if (options.skipWait) {
      yield* json(started);
      return { batch: null, error: null, problems: [] as readonly string[] };
    }

    const live = !options.wantsJson && (yield* attended);
    const watcher = yield* watchBatch(
      trials,
      progressModeOf(options.wantsJson, live)
    );
    const batch = yield* waitForBatch(
      started.id,
      watcher,
      options.timeoutSeconds
    );

    yield* options.wantsJson
      ? json(batch)
      : note(formatBatchSummary(batch, trials, live));

    const error = batchError(batch);

    return {
      batch,
      error,
      problems:
        error === null
          ? problemsWith(batch, options.gate, {
              runs: started.runs.length,
              trials,
            })
          : [],
    };
  });
