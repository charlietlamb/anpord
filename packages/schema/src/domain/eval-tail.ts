import { Schema } from "effect";
import { EvalJournalEntry } from "./evals";

export const EVAL_TAIL_PAGE = 500;

export const EvalTailMark = Schema.Struct({
  cell: Schema.String,
  ordinal: Schema.Int,
  seq: Schema.Int,
}).annotations({
  description: "How far into one trial's journal a reader has got.",
  identifier: "EvalTailMark",
});

export type EvalTailMark = typeof EvalTailMark.Type;

export const EvalTailEvent = Schema.Struct({
  cell: Schema.String,
  entry: EvalJournalEntry,
  ordinal: Schema.Int,
  seq: Schema.Int,
}).annotations({
  description: "One journal entry, addressed to the trial that wrote it.",
  identifier: "EvalTailEvent",
});

export type EvalTailEvent = typeof EvalTailEvent.Type;

export const EvalRunTailRequest = Schema.Struct({
  after: Schema.Array(EvalTailMark),
  id: Schema.String,
}).annotations({
  description:
    "Select a run, and the marks a previous read returned. Empty reads from the start.",
  identifier: "EvalRunTailRequest",
});

export const EvalRunTail = Schema.Struct({
  events: Schema.Array(EvalTailEvent),
  next: Schema.Array(EvalTailMark),
  running: Schema.Boolean,
  settled: Schema.Int,
}).annotations({
  description:
    "What a run has journalled since the marks given, and the marks to give next.",
  identifier: "EvalRunTail",
});

export type EvalRunTail = typeof EvalRunTail.Type;
