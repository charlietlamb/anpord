import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import type { Effect } from "effect";
import type { EvalStoreError } from "../domain/errors";

export interface TrialProgressShape {
  readonly append: (
    events: readonly HarnessEvent[],
    from: number
  ) => Effect.Effect<void, EvalStoreError>;
}
