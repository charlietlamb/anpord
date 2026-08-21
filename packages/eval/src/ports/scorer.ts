import { Context, type Effect } from "effect";
import type { SandboxUnavailable } from "../domain/errors";
import type { HarnessEvent } from "../domain/harness-event";
import type { TrialOutcome } from "../domain/trial";
import type { SandboxHandle } from "./sandbox";

export interface ScoreRequest {
  readonly commandCount: number;
  readonly events: readonly HarnessEvent[];
  readonly modelMs: number;
  readonly sandbox: SandboxHandle;
  /** Null for a case with no verifier, whose trials are void rather than
   * passed: nothing decided them. */
  readonly verifyCommand: string | null;
  readonly workspace: string;
}

/** One implementation in the MVP: ground truth, which runs the verifier and
 * reads its exit code. A judge would be another Layer behind this same tag and
 * is deliberately unwritten, because a judge as a gate drifts and the
 * regression signal is the one thing that has to stay stable. */
export interface ScorerShape {
  readonly score: (
    request: ScoreRequest
  ) => Effect.Effect<TrialOutcome, SandboxUnavailable>;
}

export class Scorer extends Context.Tag("@anpord/eval/Scorer")<
  Scorer,
  ScorerShape
>() {}
