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
 * What a prepare wants kept for the next run preparing the same way.
 *
 * Named rather than written: a prepare says which directory is worth keeping
 * and under what key, and the runner restores it before the prepare runs and
 * saves it after. The store is the provider's, and providers differ in what
 * theirs can do, so nothing about it reaches the script.
 *
 * The key should name everything the contents depend on -- a lockfile hash
 * above all -- because entries are write-once. A key that already holds an
 * entry keeps it, which is what makes two runs preparing at once safe.
 */
export interface PrepareCaching {
  readonly key: string;
  /** Relative to the workspace. */
  readonly path: string;
}

export interface PrepareContext {
  /** True when the runner restored a cached directory before this ran, so a
   * prepare can skip the work that produced it. */
  readonly cached: boolean;
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

/** What a prepare returns: the value its validators read, and optionally the
 * directory worth keeping for the next run. */
export interface PrepareResult {
  readonly cache?: PrepareCaching;
  readonly value?: PrepareValue;
}

export type Prepare = (
  context: PrepareContext
) =>
  | Promise<PrepareResult | PrepareValue | undefined>
  | PrepareResult
  | PrepareValue
  | undefined;

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
