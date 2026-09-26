import { Schema } from "effect";
import { EvalJournalEntry } from "./evals";

export const EvalTurn = Schema.Struct({
  index: Schema.NonNegativeInt,
  userText: Schema.String,
  agentText: Schema.String,
  commandCount: Schema.NonNegativeInt,
  events: Schema.Array(EvalJournalEntry),
});
export type EvalTurn = typeof EvalTurn.Type;
