import type { Effect } from "effect";
import type { EvalStoreError } from "../domain/errors";
import type { HarnessEvent } from "../domain/harness-event";

export interface TrialProgressShape {
  readonly append: (
    events: readonly HarnessEvent[],
    from: number
  ) => Effect.Effect<void, EvalStoreError>;
}
