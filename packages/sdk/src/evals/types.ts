import type { EvalSource } from "@anpord/schema/domain/evals";
import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";

type EvalTaskRequest = PublicStartEvalRequest["tasks"][number];

export interface CommandResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

export interface ExecOptions {
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
}

/**
 * Somewhere to keep what a prepare built, so the next run preparing the same
 * way does not build it again.
 *
 * Whole directories in and out, not a directory to work in. What backs this is
 * object storage: it takes and returns files, and does not support the renames
 * and hard links a package manager performs constantly. Pointing npm or bun at
 * it directly fails partway through an install, one package at a time.
 */
export interface PrepareCache {
  /** Whether anything was stored under this key by an earlier run. */
  readonly has: (key: string) => Promise<boolean>;
  /** Unpacks what was stored under this key into `path`, replacing it.
   * Resolves false when nothing was stored. */
  readonly restore: (key: string, path: string) => Promise<boolean>;
  /** Stores `path` under this key for the next run to restore. */
  readonly save: (key: string, path: string) => Promise<void>;
}

export interface PrepareContext {
  /** Null when the provider has nowhere to keep one. */
  readonly cache: PrepareCache | null;
  readonly exec: (
    file: string,
    args?: readonly string[],
    options?: ExecOptions
  ) => Promise<CommandResult>;
  readonly exists: (path: string) => Promise<boolean>;
  readonly readText: (path: string) => Promise<string>;
  readonly workspace: string;
}

export type PrepareValue = Readonly<Record<string, unknown>>;

export type Prepare = (
  context: PrepareContext
) => Promise<PrepareValue | undefined> | PrepareValue | undefined;

export interface ValidatorContext {
  readonly exec: (command: string) => Promise<CommandResult>;
  readonly exists: (path: string) => Promise<boolean>;
  readonly prepared: Readonly<Record<string, unknown>>;
  readonly readText: (path: string) => Promise<string>;
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
  readonly prepare?: Prepare | null;
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
