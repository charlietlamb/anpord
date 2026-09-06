import type { EvalJudge } from "@anpord/schema/domain/eval-judges";
import type { EvalHarness, EvalSource } from "@anpord/schema/domain/evals";
import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";
import type { McpCall } from "../mcp/calls";
import type { McpServerDefinition } from "../mcp/define";
import type { CliCall } from "../mock-cli/calls";
import type { CliDefinition } from "../mock-cli/define";

type EvalTaskRequest = PublicStartEvalRequest["tasks"][number];

/** A profile directory beside the eval file; `dir` resolves against it. */
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
  readonly sandbox?: EvalTaskRequest["sandbox"];
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

/** Entries are write-once, so the key must name everything the contents
 * depend on -- a lockfile hash above all. */
export interface CaseCache {
  readonly key: string;
  /** Relative to the workspace. */
  readonly path: string;
}

export interface PrepareContext {
  /** True when the runner restored a cached directory, so a prepare can skip
   * the work that produced it. */
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
  /** Empty when the agent said nothing. */
  readonly answer: () => Promise<string>;
  readonly cli: {
    readonly calls: (cli?: string) => Promise<readonly CliCall[]>;
  };
  readonly exec: (command: string) => Promise<CommandResult>;
  readonly exists: (path: string) => Promise<boolean>;
  readonly mcp: {
    readonly calls: (server?: string) => Promise<readonly McpCall[]>;
  };
  readonly prepared: Readonly<Record<string, unknown>>;
  readonly readText: (path: string) => Promise<string>;
  /** Every reply, oldest first, separated by a blank line. */
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
  /** Restored before the prepare runs, saved after it succeeds. */
  readonly cache?: CaseCache;
  readonly name: string;
  readonly prepare?: Prepare | null;
  readonly source?: DeclaredSource;
  readonly variables?: Readonly<Record<string, string>>;
}

export type EvalCaseDefinition = EvalCaseBase &
  (
    | {
        readonly validate:
          | Validator
          | EvalJudge
          | readonly (Validator | EvalJudge)[];
        readonly verify?: never;
      }
    | { readonly validate?: never; readonly verify: string }
  );

export interface EvalDefinition {
  readonly captureSource?: boolean;
  readonly cases: readonly EvalCaseDefinition[];
  readonly cli?: readonly CliDefinition[];
  readonly mcp?: readonly McpServerDefinition[];
  readonly name: string;
  readonly prompt: string;
  readonly source?: DeclaredSource;
  readonly tasks: readonly EvalTaskDefinition[];
  readonly trials: number;
}
