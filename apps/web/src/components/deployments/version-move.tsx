import { cn } from "@anpord/ui/lib/utils";
import { ArrowRightIcon } from "@phosphor-icons/react";

interface VersionMoveProps {
  readonly className?: string;
  /** Absent on a first deployment, where there is no version to move from. */
  readonly from: number | null;
  readonly to: number | null;
}

/**
 * Where a channel moved, and which way.
 *
 * The arrow turns for a move backwards, which is all a rollback needs: the
 * two numbers already say it, and a colour beside them would be the only one
 * in the card.
 */
export function VersionMove({ className, from, to }: VersionMoveProps) {
  const back = from !== null && to !== null && to < from;

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums",
        className
      )}
      title={back ? `Rolled back from v${from} to v${to}` : undefined}
    >
      {from === null ? null : (
        <>
          <span>v{from}</span>
          <ArrowRightIcon
            aria-hidden="true"
            className={cn(back && "rotate-180")}
            size={11}
            weight="bold"
          />
        </>
      )}
      <span className="text-foreground/80">
        {to === null ? "a deleted version" : `v${to}`}
      </span>
    </span>
  );
}
