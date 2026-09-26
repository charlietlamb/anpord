import { Badge } from "@anpord/ui/components/ui/badge";
import type { CSSProperties } from "react";
import type { StepVerb } from "@/lib/evals/step-title";
import { VERBS, verbColour } from "@/lib/evals/timeline-kinds";

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
      className="h-[22px] gap-[5px] rounded-[5px] pr-2 pl-1.5 tabular-nums"
      style={{ "--tint": verbColour(verb, failed) } as CSSProperties}
      variant="tinted"
    >
      <Glyph aria-hidden="true" weight="bold" />
      {count ?? label}
    </Badge>
  );
}
