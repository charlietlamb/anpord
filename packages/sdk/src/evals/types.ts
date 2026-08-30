import type { EvalSource } from "@anpord/schema/domain/evals";
import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";

type EvalTaskRequest = PublicStartEvalRequest["tasks"][number];

export interface ValidatorCommandResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

export interface ValidatorContext {
  readonly exec: (command: string) => Promise<ValidatorCommandResult>;
  readonly exists: (path: string) => Promise<boolean>;
  readonly readText: (path: string) => Promise<string>;
}

export interface ValidatorResult {
  readonly message?: string;
  readonly passed: boolean;
}

export type Validator = (
  context: ValidatorContext
) => boolean | ValidatorResult | Promise<boolean | ValidatorResult>;

interface EvalCaseBase {
  readonly goal: string;
  readonly name: string;
  readonly setup?: string | null;
  /** Omitted to use the definition's own source, which is the usual shape: a
   * suite tends to be many tasks against one repository, not one task against
   * many. */
  readonly source?: EvalSource;
}

export type EvalCaseDefinition = EvalCaseBase &
  (
    | { readonly validate: Validator; readonly verify?: never }
    | { readonly validate?: never; readonly verify: string }
  );

export interface EvalDefinition {
  readonly cases: readonly EvalCaseDefinition[];
  readonly name: string;
  readonly prompt: string;
  /** What every case works on unless it names its own. */
  readonly source?: EvalSource;
  readonly tasks: readonly EvalTaskRequest[];
  readonly trials: number;
}
