import type { EvalHomeVerdict } from "@sphynx/schema/domain/eval-home";

export const VERDICT_FILL: Record<EvalHomeVerdict, string> = {
  failed: "bg-destructive",
  flaky: "bg-warning",
  passed: "bg-success/80",
  unscored: "bg-muted-foreground/40",
};

export const VERDICT_TEXT: Record<EvalHomeVerdict, string> = {
  failed: "text-destructive",
  flaky: "text-warning",
  passed: "text-success",
  unscored: "text-muted-foreground",
};

export const VERDICT_LABEL: Record<EvalHomeVerdict, string> = {
  failed: "failing",
  flaky: "flaky",
  passed: "passing",
  unscored: "not scored",
};
