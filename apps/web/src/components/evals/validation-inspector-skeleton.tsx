import { Skeleton } from "@anpord/ui/components/skeleton";
import { SetupSurface } from "./setup-surface";

const ROWS = ["w-36", "w-28"];

export function ValidationInspectorSkeleton({
  titled = true,
}: {
  readonly titled?: boolean;
}) {
  return (
    <SetupSurface title="Validation" titled={titled}>
      <div className="space-y-3">
        {ROWS.map((width, index) => (
          <div
            className="flex h-[42px] items-center justify-between gap-3 rounded-xl border border-border-faint bg-muted/40 px-3"
            key={`validation-${index satisfies number}`}
          >
            <Skeleton className={`h-3.5 ${width}`} />
            <Skeleton className="h-3.5 w-20 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </SetupSurface>
  );
}
