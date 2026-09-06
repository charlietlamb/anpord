import type { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { triggerPresentation } from "@/lib/evals/run-trigger";

export function RunTrigger({
  trigger,
  linked = false,
}: {
  readonly trigger: EvalTrigger | null;
  readonly linked?: boolean;
}) {
  const { label, Icon } = triggerPresentation(trigger);
  const content = (
    <>
      <Icon
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground/80"
      />
      <span>{label}</span>
    </>
  );
  return linked && trigger?.url ? (
    <a
      className="inline-flex h-6 items-center gap-2 text-foreground text-xs underline-offset-4 hover:underline"
      href={trigger.url}
      rel="noopener noreferrer"
      target="_blank"
      title="Open the triggering run"
    >
      {content}
      <ArrowUpRightIcon
        aria-hidden="true"
        className="size-3 shrink-0 text-muted-foreground/80"
      />
    </a>
  ) : (
    <span
      className="inline-flex items-center gap-1.5 text-muted-foreground text-xs"
      title={
        trigger == null
          ? "This run predates trigger tracking."
          : `Started via ${label}`
      }
    >
      {content}
    </span>
  );
}
