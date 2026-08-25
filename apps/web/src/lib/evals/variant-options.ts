import type { EvalHarness, EvalProvider } from "@anpord/schema/domain/evals";

export interface VariantOption<TValue extends string = string> {
  readonly description: string;
  readonly label: string;
  readonly value: TValue;
}

export const HARNESS_OPTIONS: readonly VariantOption<EvalHarness>[] = [
  {
    description: "OpenAI's agent, running OpenAI models",
    label: "Codex",
    value: "codex",
  },
  {
    description: "Open source agent, running any provider's models",
    label: "OpenCode",
    value: "opencode",
  },
  {
    description: "Minimal open source coding agent",
    label: "Pi",
    value: "pi",
  },
  {
    description: "Vercel's terminal coding agent",
    label: "FX",
    value: "fx",
  },
  {
    description: "Anthropic's coding agent",
    label: "Claude Code",
    value: "claude",
  },
  {
    description: "Google's coding agent",
    label: "Gemini CLI",
    value: "gemini",
  },
  {
    description: "Alibaba's coding agent",
    label: "Qwen Code",
    value: "qwen",
  },
  {
    description: "Cursor's terminal coding agent",
    label: "Cursor",
    value: "cursor",
  },
];

export const DEFAULT_HARNESS: EvalHarness = "codex";

export const PROVIDER_OPTIONS: readonly VariantOption<EvalProvider>[] = [
  {
    description: "Cloud sandboxes that reattach",
    label: "Daytona",
    value: "daytona",
  },
  {
    description: "Cloud sandboxes, faster to start",
    label: "E2B",
    value: "e2b",
  },
  {
    description: "Fast ephemeral cloud sandboxes",
    label: "Upstash Box",
    value: "upstash",
  },
  {
    description: "Serverless cloud sandboxes",
    label: "Modal",
    value: "modal",
  },
  {
    description: "Edge containers through Sandbox",
    label: "Cloudflare",
    value: "cloudflare",
  },
  {
    description: "Isolated microVMs for agent workloads",
    label: "Vercel",
    value: "vercel",
  },
];

export const DEFAULT_PROVIDER: EvalProvider = "daytona";
