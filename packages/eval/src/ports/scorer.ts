import { Context, type Effect } from "effect";
import type { TrialOutcome } from "../domain/trial";
import type { SandboxHandle } from "./sandbox";

export interface ScoreRequest {
  readonly commandCount: number;
  readonly modelMs: number;
  readonly sandbox: SandboxHandle;
  readonly verifyCommand: string;
  readonly workspace: string;
}

/** One implementation in the MVP: ground truth, which runs the verifier and
 * reads its exit code. A judge would be another Layer behind this same tag and
 * is deliberately unwritten, because a judge as a gate drifts and the
 * regression signal is the one thing that has to stay stable. */
export interface ScorerShape {
  readonly score: (request: ScoreRequest) => Effect.Effect<TrialOutcome>;
}

export class Scorer extends Context.Tag("@anpord/eval/Scorer")<
  Scorer,
  ScorerShape
>() {}
