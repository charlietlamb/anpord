import { cn } from "@anpord/ui/lib/utils";

interface VersionChangeProps {
  readonly className?: string;
  /** Absent when the channel served nothing, where there is no version to
   * leave behind and only a first one to start serving. */
  readonly from: number | null;
  readonly to: number;
}

/** A move reads as its destination, with what it leaves behind struck through
 * beside it. Used wherever a pending change is shown, so the grid and the
 * review say the same thing the same way. */
export function VersionChange({ className, from, to }: VersionChangeProps) {
  return (
    <span className={cn("flex items-baseline gap-1.5 tabular-nums", className)}>
      {from === null ? null : (
        <span className="text-muted-foreground line-through">v{from}</span>
      )}
      <span className="font-medium text-[0.8125rem]">v{to}</span>
    </span>
  );
}
