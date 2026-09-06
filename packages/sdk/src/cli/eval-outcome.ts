import type { EvalRun } from "@anpord/schema/domain/evals";
import type { Option } from "effect";

export interface EvalOutcome {
  readonly file: string;
  readonly problems: readonly string[];
  readonly run: Option.Option<EvalRun>;
}
