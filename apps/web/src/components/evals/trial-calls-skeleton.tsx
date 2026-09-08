import { Skeleton } from "@anpord/ui/components/skeleton";
import { PlugsConnectedIcon } from "@phosphor-icons/react";
import { SetupSurface } from "./setup-surface";

/* Widths stand in for a server-prefixed tool name, which is what almost every
   row holds: long enough to read as one, varied so the list is not a comb. */
const ROWS = ["w-52", "w-44", "w-56"];

export function TrialCallsSkeleton() {
  return (
    <SetupSurface
      contentClassName="space-y-1"
      Icon={PlugsConnectedIcon}
      title="Calls"
    >
      {ROWS.map((width, index) => (
        <div
          className="flex items-center gap-2 px-3.5 py-2.5"
          key={`call-${index satisfies number}`}
        >
          <Skeleton className="h-3 w-2 shrink-0" />
          <Skeleton className={`h-3.5 ${width}`} />
          <Skeleton className="ml-auto h-4 w-16 shrink-0 rounded-md" />
        </div>
      ))}
    </SetupSurface>
  );
}
