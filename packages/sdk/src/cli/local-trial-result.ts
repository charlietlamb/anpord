import { TrialTimedOut } from "@anpord/eval/domain/errors";
import { describeCause } from "@anpord/eval/domain/failure";
import type { HarnessEvent } from "@anpord/schema/domain/harness-event";
import type { TrialOutcome } from "@anpord/schema/domain/trial";
import type { TokenCounts } from "@anpord/schema/domain/usage-health";
import type {
  BrokenTrialReport,
  ScoredTrialReport,
} from "@anpord/schema/public/runner-api";
import { Cause, Option } from "effect";
import type { Verdict } from "./transcript-verdict";

export type LocalStatus = "passed" | "failed" | "void" | "timed out";

export type LocalTrialResult =
  | {
      readonly commands: number;
      readonly durationMs: number;
      readonly events: readonly HarnessEvent[];
      readonly kind: "scored";
      readonly outcome: TrialOutcome;
      readonly sandboxId: string;
      readonly usage: ScoredTrialReport["usage"];
      readonly userSpend: ScoredTrialReport["userSpend"];
    }
  | {
      readonly durationMs: number;
      readonly events: readonly HarnessEvent[];
      readonly kind: "broken";
      readonly reason: string;
      readonly timedOut: boolean;
    };

export type BrokenTrial = Extract<
  LocalTrialResult,
  { readonly kind: "broken" }
>;

export type ReportRequest =
  | { readonly payload: ScoredTrialReport }
  | { readonly payload: BrokenTrialReport };

export interface LocalCase {
  readonly commands: number;
  readonly durationMs: number;
  readonly name: string;
  readonly ordinal: number;
  readonly reason: string | null;
  readonly status: LocalStatus;
  readonly usage: TokenCounts | null;
  readonly variant: string;
}

export const brokenBy = (
  cause: Cause.Cause<unknown>,
  durationMs: number,
  events: readonly HarnessEvent[]
): LocalTrialResult => ({
  durationMs,
  events,
  kind: "broken",
  reason: describeCause(cause),
  timedOut: Option.exists(
    Cause.failureOption(cause),
    (error) => error instanceof TrialTimedOut
  ),
});

export const reportRequest = (
  result: LocalTrialResult,
  ordinal: number,
  runId: string
): ReportRequest =>
  result.kind === "scored"
    ? {
        payload: {
          events: result.events,
          ordinal,
          outcome: result.outcome,
          runId,
          sandboxId: result.sandboxId,
          usage: result.usage,
          userSpend: result.userSpend,
        },
      }
    : {
        payload: {
          events: result.events,
          failure: result.reason,
          ordinal,
          runId,
          sandboxId: null,
          usage: null,
        },
      };

const UNSCORED: TrialOutcome = {
  artifacts: [],
  commandCount: 0,
  exitCode: -1,
  modelMs: 0,
  sandboxMs: 0,
  status: "void",
  validations: [],
  verifySteps: [],
  voidFields: [],
};

export const unscoredForOlderServer = (
  result: BrokenTrial,
  ordinal: number,
  runId: string
): ReportRequest => ({
  payload: {
    events: result.events,
    ordinal,
    outcome: UNSCORED,
    runId,
    sandboxId: null,
    usage: null,
    userSpend: null,
  },
});

export const verdictOf = (result: LocalTrialResult): Verdict =>
  result.kind === "scored"
    ? result.outcome
    : {
        failure: result.reason,
        status: result.timedOut ? "timed out" : "void",
        verifySteps: [],
        voidFields: [],
      };

const statusOf = (result: LocalTrialResult): LocalStatus => {
  if (result.kind === "scored") {
    return result.outcome.status === "passed" ||
      result.outcome.status === "failed"
      ? result.outcome.status
      : "void";
  }
  return result.timedOut ? "timed out" : "void";
};

export const localCaseOf = (
  result: LocalTrialResult,
  trial: {
    readonly name: string;
    readonly ordinal: number;
    readonly variant: string;
  }
): LocalCase => ({
  ...trial,
  commands: result.kind === "scored" ? result.commands : 0,
  durationMs: result.durationMs,
  reason: result.kind === "broken" ? result.reason : null,
  status: statusOf(result),
  usage: result.kind === "scored" ? result.usage : null,
});
