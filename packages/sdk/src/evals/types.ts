import type { ApiCall } from "@anpord/schema/domain/api-mocks";
import type { EvalJudge } from "@anpord/schema/domain/eval-judges";
import type { EvalTurn, EvalUser } from "@anpord/schema/domain/eval-turns";
import type {
  EvalHarness,
  EvalSource,
  EvalVariantRequest,
} from "@anpord/schema/domain/evals";
import type { McpCall } from "../mcp/calls";
import type { McpServerDefinition } from "../mcp/define";
import type { ApiDefinition } from "../mock-api/define";
import type { CliCall } from "../mock-cli/calls";
import type { CliDefinition } from "../mock-cli/define";

export interface ProfileRef {
  readonly dir: string;
  readonly name: string;
}

export type VariantInput = typeof EvalVariantRequest.Encoded;

export type HarnessRef =
  | EvalHarness
  | { readonly base: EvalHarness; readonly profile: ProfileRef };

export interface EvalVariantDefinition {
  readonly harness: HarnessRef;
  readonly model: EvalVariantRequest["model"];
  readonly sandbox?: EvalVariantRequest["sandbox"];
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

export interface CaseCache {
  readonly key: string;
  readonly path: string;
}

export interface PrepareContext {
  readonly api: { readonly url: (name: string) => Promise<string> };
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
  readonly answer: () => Promise<string>;
  readonly api: {
    readonly url: (name: string) => Promise<string>;
    readonly calls: (name?: string) => Promise<readonly ApiCall[]>;
  };
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
  readonly transcript: () => Promise<string>;
  readonly turns: () => Promise<readonly EvalTurn[]>;
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
  readonly cache?: CaseCache;
  readonly id: string;
  readonly name: string;
  readonly prepare?: Prepare | null;
  readonly source?: DeclaredSource;
  readonly tags?: readonly string[];
  readonly user?: EvalUser;
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

export type SingleCaseDefinition = EvalCaseDefinition & {
  readonly prompt: string;
  readonly variants: readonly EvalVariantDefinition[];
  readonly trials: number;
};

export interface EvalDefinition {
  readonly api?: readonly ApiDefinition[];
  readonly captureSource?: boolean;
  readonly captureValidation?: boolean;
  readonly cases: readonly EvalCaseDefinition[];
  readonly cli?: readonly CliDefinition[];
  readonly id?: string;
  readonly mcp?: readonly McpServerDefinition[];
  readonly name: string;
  readonly prompt: string;
  readonly source?: DeclaredSource;
  readonly trials: number;
  readonly variants: readonly EvalVariantDefinition[];
}
