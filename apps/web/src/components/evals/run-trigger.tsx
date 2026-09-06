import type { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import { triggerLabel } from "@/lib/evals/run-trigger";

export function RunTrigger({
  trigger,
  linked = false,
}: {
  readonly trigger: EvalTrigger | null;
  readonly linked?: boolean;
}) {
  const label = triggerLabel(trigger);
  return linked && trigger?.url ? (
    <a
      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      href={trigger.url}
      rel="noopener noreferrer"
      target="_blank"
      title="Open the triggering run"
    >
      {label} ↗
    </a>
  ) : (
    <span
      className="text-muted-foreground"
      title={
        trigger === null
          ? "This run predates trigger tracking."
          : `Started via ${label}`
      }
    >
      {label}
    </span>
  );
}
