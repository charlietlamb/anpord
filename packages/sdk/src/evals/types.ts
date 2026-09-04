import type { EvalHarness, EvalSource } from "@anpord/schema/domain/evals";
import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";

type EvalTaskRequest = PublicStartEvalRequest["tasks"][number];

/**
 * A profile directory beside the eval file.
 *
 * `dir` resolves against the eval file. Files under `home/` and `workspace/`
 * are shipped into the sandbox; an optional `profile.json` names a system
 * prompt, env, and for the command harness the install and run steps.
 */
export interface ProfileRef {
  readonly dir: string;
  readonly name: string;
}

export type HarnessRef =
  | EvalHarness
  | { readonly base: EvalHarness; readonly profile: ProfileRef };

export interface EvalTaskDefinition {
  readonly harness: HarnessRef;
  readonly model: EvalTaskRequest["model"];
  readonly provider: EvalTaskRequest["provider"];
}

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
 * A directory worth keeping between runs of the same case.
 *
 * Declared on the case rather than returned by the prepare, because a restore
 * has to happen before the prepare runs: something that only exists once it has
 * finished cannot say where to look. This is the shape CI caches use for the
 * same reason -- actions/cache names its path and key before the step, not
 * after.
 *
 * The key should name everything the contents depend on, a lockfile hash above
 * all, because entries are write-once: a key that already holds an entry keeps
 * it, which is what makes two runs preparing at once safe.
 */
export interface CaseCache {
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

export type Prepare = (
  context: PrepareContext
) => Promise<PrepareValue | undefined> | PrepareValue | undefined;

export interface ValidatorContext {
  /** The agent's final reply, empty when it said nothing. */
  readonly answer: () => Promise<string>;
  readonly exec: (command: string) => Promise<CommandResult>;
  readonly exists: (path: string) => Promise<boolean>;
  readonly prepared: Readonly<Record<string, unknown>>;
  readonly readText: (path: string) => Promise<string>;
  /** Every reply the agent made, oldest first, separated by a blank line. */
  readonly transcript: () => Promise<string>;
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
  /** What a prepare builds that is worth keeping for the next run of this
   * case. Restored before it runs, and saved after it succeeds. */
  readonly cache?: CaseCache;
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
  readonly tasks: readonly EvalTaskDefinition[];
  readonly trials: number;
}
