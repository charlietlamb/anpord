import { EvalHarness, EvalSandbox } from "@anpord/schema/domain/evals";

export const ProviderName = EvalSandbox;
export type ProviderName = typeof ProviderName.Type;

export const HarnessName = EvalHarness;
export type HarnessName = typeof HarnessName.Type;
