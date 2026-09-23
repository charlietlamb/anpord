import { cn } from "@anpord/ui/lib/utils";
import { type JournalKind, KIND_ICONS } from "@/lib/evals/journal-presentation";

export function KindIcon({
  className,
  failed = false,
  kind,
}: {
  readonly className?: string;
  readonly failed?: boolean;
  readonly kind: JournalKind;
}) {
  const Glyph = KIND_ICONS[kind];

  return (
    <Glyph
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0",
        failed ? "text-warning" : "text-muted-foreground",
        className
      )}
    />
  );
}
