import { cn } from "@anpord/ui/lib/utils";
import { ArrowRightIcon } from "@phosphor-icons/react";

interface VersionMoveProps {
  readonly className?: string;
  /** Absent on a first deployment, where there is no version to move from. */
  readonly from: number | null;
  readonly to: number;
}

export function VersionMove({ className, from, to }: VersionMoveProps) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums",
        className
      )}
    >
      {from === null ? null : (
        <>
          <span>v{from}</span>
          <ArrowRightIcon aria-hidden="true" size={11} weight="bold" />
        </>
      )}
      <span className="text-foreground/80">v{to}</span>
    </span>
  );
}
