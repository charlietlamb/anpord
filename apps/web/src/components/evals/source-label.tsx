import type { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import { placePresentation } from "@anpord/ui/components/evals/variant-presentation";
import { Badge } from "@anpord/ui/components/ui/badge";
import { triggerPresentation } from "@/lib/evals/run-trigger";

export function SourceLabel({
  local,
  sandbox,
  trigger,
}: {
  readonly local: boolean;
  readonly sandbox: string;
  readonly trigger: EvalTrigger | null;
}) {
  const source = triggerPresentation(trigger);
  const place = placePresentation({ local, sandbox });

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Badge size="sm" variant="secondary">
        <source.Icon aria-hidden="true" />
        {source.label}
      </Badge>
      <Badge size="sm" variant="secondary">
        <place.Icon aria-hidden="true" />
        {place.label}
      </Badge>
    </span>
  );
}
