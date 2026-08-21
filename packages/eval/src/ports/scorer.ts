import { Context, type Effect } from "effect";
import type { SandboxUnavailable } from "../domain/errors";
import type { HarnessEvent } from "../domain/harness-event";
import type { TrialOutcome } from "../domain/trial";
import type { SandboxHandle } from "./sandbox";

export interface ScoreRequest {
  readonly commandCount: number;
  /** What the agent actually did, in order.
   *
   * A scorer that sees only the workspace can ask whether the end state is
   * right; the trajectory is how a customer asks whether it got there the
   * right way. Every company in the research scores this, and none of their
   * assertions can be written against the workspace alone. */
  readonly events: readonly HarnessEvent[];
  readonly modelMs: number;
  readonly sandbox: SandboxHandle;
  /** Null when the case carries no verifier.
   *
   * An imported evals.json has none: its expected output is prose and its
   * assertions are prose, and neither decides a run. A case like that has no
   * evidence, which is what void means, so it is never scored as a pass. */
  readonly verifyCommand: string | null;
  readonly workspace: string;
}

/** One implementation in the MVP: ground truth, which runs the verifier and
 * reads its exit code. A judge would be another Layer behind this same tag and
 * is deliberately unwritten, because a judge as a gate drifts and the
 * regression signal is the one thing that has to stay stable. */
export interface ScorerShape {
  /** Fails rather than swallowing.
   *
   * A never in this channel forced the implementation to catch a dead
   * sandbox and return an empty result, which read as a measured test
   * failure: an outage became a regression that never happened, promotable
   * as a baseline. Both callers already fail this way, so the error
   * propagates to the boundary that owns retry. */
  readonly score: (
    request: ScoreRequest
  ) => Effect.Effect<TrialOutcome, SandboxUnavailable>;
}

export class Scorer extends Context.Tag("@anpord/eval/Scorer")<
  Scorer,
  ScorerShape
>() {}
