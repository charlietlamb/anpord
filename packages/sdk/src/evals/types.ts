import type { EvalSource } from "@anpord/schema/domain/evals";
import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";

type EvalTaskRequest = PublicStartEvalRequest["tasks"][number];

export interface ValidatorCommandResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

export interface ExecOptions {
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
}

export interface SetupContext {
  readonly exec: (
    file: string,
    args?: readonly string[],
    options?: ExecOptions
  ) => Promise<ValidatorCommandResult>;
  readonly exists: (path: string) => Promise<boolean>;
  readonly readText: (path: string) => Promise<string>;
  readonly workspace: string;
}

export type SetupValue = Readonly<Record<string, unknown>>;

export type WorkspaceSetup = (
  context: SetupContext
) => Promise<SetupValue | undefined> | SetupValue | undefined;

export interface ValidatorContext {
  readonly exec: (command: string) => Promise<ValidatorCommandResult>;
  readonly exists: (path: string) => Promise<boolean>;
  readonly readText: (path: string) => Promise<string>;
  readonly setup: Readonly<Record<string, unknown>>;
}

export interface ValidatorResult {
  readonly message?: string;
  readonly passed: boolean;
}

export type Validator = (
  context: ValidatorContext
) => boolean | ValidatorResult | Promise<boolean | ValidatorResult>;

type DeclaredSource = EvalSource | string;

interface EvalCaseBase {
  readonly name: string;
  readonly setup?: WorkspaceSetup | null;
  readonly source?: DeclaredSource;
  readonly variables?: Readonly<Record<string, string>>;
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
  readonly source?: DeclaredSource;
  readonly tasks: readonly EvalTaskRequest[];
  readonly trials: number;
}
