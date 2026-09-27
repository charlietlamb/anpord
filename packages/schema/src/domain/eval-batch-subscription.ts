import { Schema } from "effect";

export const batchTagOf = (batchId: string) => `batch_${batchId}`;

export const BatchSubscription = Schema.Struct({
  expiresAtMillis: Schema.Number,
  tag: Schema.String,
  token: Schema.String,
}).annotations({
  description: "A scoped, read-only token for watching one batch in real time.",
  identifier: "BatchSubscription",
});
export type BatchSubscription = typeof BatchSubscription.Type;
