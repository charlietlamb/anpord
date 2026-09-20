import { Skeleton } from "@anpord/ui/components/skeleton";
import { PlugsConnectedIcon } from "@phosphor-icons/react";

const ROWS = ["w-56", "w-72", "w-64", "w-48"];

export function TrialCallsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-6 items-center gap-2 text-muted-foreground text-xs">
        <PlugsConnectedIcon aria-hidden="true" className="size-3.5 shrink-0" />
        <Skeleton className="h-3.5 w-4" />
        <span>Calls</span>
      </div>

      <div className="flex flex-col">
        {ROWS.map((width) => (
          <div className="flex h-8 items-center gap-2.5 px-2" key={width}>
            <Skeleton className="h-3 w-4 shrink-0" />
            <Skeleton className="size-3.5 shrink-0 rounded-sm" />
            <Skeleton className={`h-3 ${width}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
