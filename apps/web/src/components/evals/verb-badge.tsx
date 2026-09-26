import { Badge } from "@anpord/ui/components/ui/badge";
import type { StepVerb } from "@/lib/evals/step-title";
import { VERBS } from "@/lib/evals/timeline-kinds";

export function VerbBadge({
  count,
  failed = false,
  verb,
}: {
  readonly count?: number;
  readonly failed?: boolean;
  readonly verb: StepVerb;
}) {
  const { icon: Glyph, label } = VERBS[verb];

  return (
    <Badge
      aria-label={count === undefined ? undefined : `${count} ${label}`}
      className="tabular-nums"
      size="xs"
      variant={failed ? "destructive" : "secondary"}
    >
      <Glyph aria-hidden="true" className="text-muted-foreground" />
      {count ?? label}
    </Badge>
  );
}
