import { EvalJudge } from "@anpord/schema/domain/eval-judges";
import {
  EvalScriptedUser,
  EvalSimulatedUser,
} from "@anpord/schema/domain/eval-turns";
import { Schema } from "effect";

export type {
  EvalJudge as Judge,
  EvalJudgment as Judgment,
} from "@anpord/schema/domain/eval-judges";

export type JudgeOptions = typeof EvalJudge.Encoded extends infer Options
  ? Options extends { readonly kind: "judge" }
    ? Omit<Options, "kind">
    : never
  : never;

export const judge = (options: JudgeOptions): EvalJudge =>
  Schema.decodeUnknownSync(EvalJudge)(
    { ...options, kind: "judge" },
    { onExcessProperty: "error" }
  );

export type {
  EvalTurn as Turn,
  EvalUser as User,
} from "@anpord/schema/domain/eval-turns";

export type HumanOptions = typeof EvalSimulatedUser.Encoded extends infer O
  ? O extends { readonly kind: "simulated" }
    ? Omit<O, "kind">
    : never
  : never;

export const human = (options: HumanOptions): EvalSimulatedUser =>
  Schema.decodeUnknownSync(EvalSimulatedUser)(
    { ...options, kind: "simulated" },
    { onExcessProperty: "error" }
  );

export const script = (replies: readonly string[]): EvalScriptedUser =>
  Schema.decodeUnknownSync(EvalScriptedUser)(
    { kind: "scripted", replies },
    { onExcessProperty: "error" }
  );
