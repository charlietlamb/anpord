import { Schema } from "effect";
import { EvalHarness } from "./harness";

const text = Schema.String.pipe(Schema.minLength(1));

/* Pinned here rather than chosen per case: a weak simulator approves a
   summary contradicting its own brief, so the case passes for the wrong
   reason. SPHYNX_USER_MODEL overrides it for a whole run. */
export const DEFAULT_USER_MODEL = "gpt-5.4-mini";

const simulated = {
  kind: Schema.Literal("simulated"),
  goal: text.pipe(Schema.maxLength(2000)),
  prompt: text.pipe(Schema.maxLength(8000)),
};

export const EvalSimulatedUser = Schema.Union(
  Schema.Struct({
    ...simulated,
    harness: Schema.optional(Schema.Never),
    model: Schema.optional(Schema.Never),
  }),
  Schema.Struct({
    ...simulated,
    harness: Schema.Literal(
      ...EvalHarness.literals.filter((harness) => harness !== "command")
    ),
    model: text.pipe(Schema.maxLength(200)),
  })
);
export type EvalSimulatedUser = typeof EvalSimulatedUser.Type;

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

/* `user-done` is a measurement: the person judged the agent finished.
   `no-user` is a broken setup that would otherwise be indistinguishable
   from it, and a case scored as though a silent person had approved. */
export const EvalTurnsEnded = Schema.Literal(
  "single-turn",
  "user-done",
  "max-turns",
  "no-user",
  "failed"
);
export type EvalTurnsEnded = typeof EvalTurnsEnded.Type;
