import { Schema } from "effect";
import { EvalJournalEntry } from "./evals";

export const EVAL_TAIL_PAGE = 500;

export const EvalTailMark = Schema.Struct({
  ordinal: Schema.Int,
  run: Schema.String,
  seq: Schema.Int,
}).annotations({
  description: "How far into one trial's journal a reader has got.",
  identifier: "EvalTailMark",
});
export type EvalTailMark = typeof EvalTailMark.Type;

export const EvalTailEvent = Schema.Struct({
  entry: EvalJournalEntry,
  ordinal: Schema.Int,
  run: Schema.String,
  seq: Schema.Int,
}).annotations({
  description: "One journal entry, addressed to the trial that wrote it.",
  identifier: "EvalTailEvent",
});
export type EvalTailEvent = typeof EvalTailEvent.Type;

export const EvalBatchTailRequest = Schema.Struct({
  after: Schema.Array(EvalTailMark),
  id: Schema.String,
}).annotations({
  description:
    "Select a batch, and the marks a previous read returned. Empty reads from the start.",
  identifier: "EvalBatchTailRequest",
});

export const EvalBatchTail = Schema.Struct({
  events: Schema.Array(EvalTailEvent),
  next: Schema.Array(EvalTailMark),
  running: Schema.Boolean,
  settled: Schema.Int,
}).annotations({
  description:
    "What a batch has journalled since the marks given, and the marks to give next.",
  identifier: "EvalBatchTail",
});
export type EvalBatchTail = typeof EvalBatchTail.Type;
