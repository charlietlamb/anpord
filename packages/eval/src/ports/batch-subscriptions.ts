import type { BatchSubscription } from "@anpord/schema/domain/eval-batch-subscription";
import { Context, type Effect } from "effect";

export interface BatchSubscriptionsShape {
  readonly mint: (batchId: string) => Effect.Effect<BatchSubscription>;
}

export class BatchSubscriptions extends Context.Tag(
  "@anpord/eval/BatchSubscriptions"
)<BatchSubscriptions, BatchSubscriptionsShape>() {}
