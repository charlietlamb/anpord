import { createRequire } from "node:module";
import { join } from "node:path";

type Compiler = typeof import("../../../../packages/sdk/src/evals/compiler");
type EvalLocal = typeof import("../../../../packages/sdk/src/cli/eval-local");
type TrialResults =
  typeof import("../../../../packages/sdk/src/cli/local-trial-result");
type EffectModule = typeof import("effect");

export type LocalTrialResult =
  import("../../../../packages/sdk/src/cli/local-trial-result").LocalTrialResult;

export interface RunnerTarget {
  readonly compileEval: Compiler["compileEval"];
  readonly effect: EffectModule;
  readonly reportRequest: TrialResults["reportRequest"];
  readonly runLocally: EvalLocal["runLocally"];
}

export const loadRunnerTarget = async (root: string): Promise<RunnerTarget> => {
  const sdk = join(root, "packages/sdk");
  const effect = (await import(
    createRequire(join(sdk, "package.json")).resolve("effect")
  )) as EffectModule;
  const compiler = (await import(
    join(sdk, "src/evals/compiler.ts")
  )) as Compiler;
  const local = (await import(join(sdk, "src/cli/eval-local.ts"))) as EvalLocal;
  const results = (await import(
    join(sdk, "src/cli/local-trial-result.ts")
  )) as TrialResults;
  return {
    compileEval: compiler.compileEval,
    effect,
    reportRequest: results.reportRequest,
    runLocally: local.runLocally,
  };
};
