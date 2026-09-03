import type { EvalRun } from "@anpord/schema/domain/evals";
import type { Option } from "effect";

/** What one eval file produced: the gate's problems, and the finished run
 * when the command waited for it. */
export interface EvalOutcome {
  readonly file: string;
  readonly problems: readonly string[];
  readonly run: Option.Option<EvalRun>;
}
