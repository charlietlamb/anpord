import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import type { EvalValidator } from "@anpord/schema/domain/evals";
import { Context, type Effect } from "effect";
import type { SandboxUnavailable } from "../domain/errors";
import type { HarnessEvent } from "../domain/harness-event";
import type { TrialOutcome } from "../domain/trial";
import type { SandboxHandle } from "./sandbox";

export interface ScoreRequest {
  readonly commandCount: number;
  readonly events: readonly HarnessEvent[];
  readonly modelMs: number;
  readonly onValidation?: ValidationObserver;
  readonly prepared?: Readonly<Record<string, unknown>>;
  readonly sandbox: SandboxHandle;
  readonly validationPrefix?: string;
  readonly validator?: EvalValidator | null;
  /* Null for a case with no verifier, whose trials are void rather than passed. */
  readonly verifyCommand: string | null;
  readonly workspace: string;
}

export type ValidationObserver = (
  validation: EvalValidation
) => Effect.Effect<void>;

export interface ScorerShape {
  readonly score: (
    request: ScoreRequest
  ) => Effect.Effect<TrialOutcome, SandboxUnavailable>;
}

export class Scorer extends Context.Tag("@anpord/eval/Scorer")<
  Scorer,
  ScorerShape
>() {}
