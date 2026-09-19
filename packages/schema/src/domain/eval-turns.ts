import { Schema } from "effect";

const text = Schema.String.pipe(Schema.minLength(1));

/* Pinned here rather than chosen per case: a weak simulator approves a
   summary contradicting its own brief, so the case passes for the wrong
   reason. ANPORD_USER_MODEL overrides it for a whole run. */
export const DEFAULT_USER_MODEL = "gpt-5.4-mini";

/* Long enough for an interview that stalls, short enough that a runaway
   conversation is a failure rather than a bill. */
export const MAX_USER_TURNS = 8;

/* What the agent may be told to go ahead with. A user who approves nothing
   declines every offer, which is what makes an approval worth asking for. */
export const EvalApproval = Schema.Literal("push");
export type EvalApproval = typeof EvalApproval.Type;

export const EvalSimulatedUser = Schema.Struct({
  kind: Schema.Literal("simulated"),
  goal: text.pipe(Schema.maxLength(2000)),
  /* The private brief. The agent learns a fact by asking for it, so a case
     tests whether it asked rather than whether it guessed. */
  facts: Schema.Array(text.pipe(Schema.maxLength(1000))).pipe(
    Schema.maxItems(50)
  ),
  approves: Schema.optionalWith(Schema.Array(EvalApproval), {
    default: () => [],
  }),
});
export type EvalSimulatedUser = typeof EvalSimulatedUser.Type;

/* A fixed script, for a case whose point is the ordering rather than the
   conversation. The agent's own words never reach it. */
export const EvalScriptedUser = Schema.Struct({
  kind: Schema.Literal("scripted"),
  replies: Schema.Array(text.pipe(Schema.maxLength(4000))).pipe(
    Schema.minItems(1),
    Schema.maxItems(24)
  ),
});
export type EvalScriptedUser = typeof EvalScriptedUser.Type;

export const EvalUser = Schema.Union(EvalSimulatedUser, EvalScriptedUser);
export type EvalUser = typeof EvalUser.Type;

/* What a turn-aware validator reads. The config after each turn is what makes
   "not before the user said yes" answerable at all. */
export const EvalTurn = Schema.Struct({
  index: Schema.NonNegativeInt,
  userText: Schema.String,
  agentText: Schema.String,
  commandCount: Schema.NonNegativeInt,
});
export type EvalTurn = typeof EvalTurn.Type;

/* A conversation ends because the user is done, because the case ran out of
   turns, or because the harness could not resume. The reason is kept: a run
   cut short is not a run the agent finished. */
export const EvalTurnsEnded = Schema.Literal(
  "user-done",
  "max-turns",
  "failed"
);
export type EvalTurnsEnded = typeof EvalTurnsEnded.Type;
