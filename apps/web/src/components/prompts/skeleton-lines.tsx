import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";

interface SkeletonLinesProps {
  readonly className?: string;
  readonly lineClassName?: string;
  /** Ragged widths, so a block of lines reads as prose rather than a bar. */
  readonly widths: readonly string[];
}

export function SkeletonLines({
  className,
  lineClassName,
  widths,
}: SkeletonLinesProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {widths.map((width) => (
        <Skeleton className={cn("h-3.5", width, lineClassName)} key={width} />
      ))}
    </div>
  );
}
