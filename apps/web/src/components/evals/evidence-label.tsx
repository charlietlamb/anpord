import { cn } from "@anpord/ui/lib/utils";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BracketsCurlyIcon,
  type Icon,
  WarningIcon,
} from "@phosphor-icons/react";

const SLOTS: Record<string, { Glyph: Icon; tone: string }> = {
  Arguments: { Glyph: ArrowUpIcon, tone: "text-muted-foreground" },
  Error: { Glyph: WarningIcon, tone: "text-destructive" },
  Input: { Glyph: ArrowUpIcon, tone: "text-muted-foreground" },
  "Invocation input": { Glyph: ArrowUpIcon, tone: "text-muted-foreground" },
  Output: { Glyph: ArrowDownIcon, tone: "text-foreground/70" },
  Request: { Glyph: ArrowUpIcon, tone: "text-muted-foreground" },
  "Return value": { Glyph: BracketsCurlyIcon, tone: "text-foreground/70" },
};

export function EvidenceLabel({ label }: { readonly label: string }) {
  const slot = SLOTS[label];

  if (slot === undefined) {
    return <span className="min-w-0 flex-1 truncate">{label}</span>;
  }

  const { Glyph, tone } = slot;

  return (
    <span
      className={cn(
        "inline-flex min-w-0 flex-1 items-center gap-1.5 font-medium",
        tone
      )}
    >
      <Glyph aria-hidden="true" className="size-3.5 shrink-0" weight="bold" />
      <span className="truncate">{label}</span>
    </span>
  );
}
