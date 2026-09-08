import { Skeleton } from "@anpord/ui/components/skeleton";
import { CheckSquareIcon } from "@phosphor-icons/react";
import { SetupSurface } from "./setup-surface";

const ROWS = ["w-36", "w-28"];

export function ValidationInspectorSkeleton() {
  return (
    <SetupSurface Icon={CheckSquareIcon} title="Validation">
      {/* The tabs are static, so they arrive with the page rather than after it. */}
      <div className="mb-4 flex items-center gap-4 border-border-faint border-b">
        <span className="border-foreground border-b-2 pb-2 font-medium text-sm">
          Results
        </span>
        <span className="pb-2 text-muted-foreground text-sm">Source</span>
      </div>

      <div className="space-y-3">
        {ROWS.map((width, index) => (
          <div
            className="flex items-center justify-between gap-3 px-2 py-3"
            key={`validation-${index satisfies number}`}
          >
            <Skeleton className={`h-4 ${width}`} />
            <Skeleton className="h-4 w-20 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </SetupSurface>
  );
}
