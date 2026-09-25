import type { StartedBatch } from "@anpord/schema/domain/evals";
import { Effect } from "effect";
import { webUrlConfig } from "../client/config";
import {
  formatBatchSummary,
  type ProgressMode,
  watchBatch,
} from "./batch-progress";
import { waitForBatch } from "./batch-wait";
import { batchError, type EvalGate, problemsWith } from "./eval-gate";
import { batchUrl } from "./github-check";
import { openBrowser } from "./open-browser";
import { attended, json, note } from "./render";

export interface HostedOptions {
  readonly gate: EvalGate;
  readonly skipWait: boolean;
  readonly timeoutSeconds: number;
  readonly ui: boolean;
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
    const terminal = yield* watchBatch(
      trials,
      progressModeOf(options.wantsJson, live)
    );
    /* The dashboard already follows a batch as it runs, so this opens that page
       rather than serving a second copy of it that could drift. */
    if (options.ui) {
      yield* openBrowser(batchUrl(yield* webUrlConfig, started.id));
    }

    const batch = yield* waitForBatch(
      started.id,
      terminal,
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
  }).pipe(Effect.scoped);
