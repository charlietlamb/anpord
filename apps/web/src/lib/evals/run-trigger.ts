import type { EvalTrigger } from "@anpord/schema/domain/eval-trigger";

const LABELS = {
  api: "API",
  ci: "CI",
  cli: "CLI",
  dashboard: "Dashboard",
  mcp: "MCP",
} satisfies Record<EvalTrigger["source"], string>;

export const triggerLabel = (trigger: EvalTrigger | null) =>
  trigger === null ? "Unknown" : LABELS[trigger.source];
