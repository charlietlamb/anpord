import { Schema } from "effect";

export const EvalHarness = Schema.Literal(
  "codex",
  "opencode",
  "pi",
  "fx",
  "claude",
  "gemini",
  "qwen",
  "cursor",
  "command"
);
export type EvalHarness = typeof EvalHarness.Type;
