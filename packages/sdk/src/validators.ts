import { EvalJudge } from "@anpord/schema/domain/eval-judges";
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
