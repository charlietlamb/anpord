import { Skeleton } from "@anpord/ui/components/skeleton";
import { PageTabs } from "@anpord/ui/components/ui/page-tabs";
import {
  CheckSquareIcon,
  FileCodeIcon,
  ListChecksIcon,
} from "@phosphor-icons/react";
import { SetupSurface } from "./setup-surface";

const ROWS = ["w-36", "w-28"];

export function ValidationInspectorSkeleton({
  titled = true,
}: {
  readonly titled?: boolean;
}) {
  return (
    <SetupSurface Icon={CheckSquareIcon} title="Validation" titled={titled}>
      {/* The tabs are static, so they arrive with the page rather than after it. */}
      <div className="mb-3 flex items-center">
        <PageTabs
          onChange={() => undefined}
          options={[
            { Icon: ListChecksIcon, label: "Results", value: "results" },
            { Icon: FileCodeIcon, label: "Source", value: "source" },
          ]}
          value="results"
        />
      </div>

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
