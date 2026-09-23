import { Skeleton } from "@anpord/ui/components/skeleton";
import { DataTableSkeleton } from "@anpord/ui/components/ui/data-table";
import { TIMELINE_COLUMNS } from "@/components/evals/waterfall-scale";
import { PageShell } from "@/components/layout/page-shell";

const HEADINGS = ["Step", ""];

export function TrialSkeleton() {
  return (
    <PageShell
      description={<Skeleton className="h-4 w-80" />}
      title="Trial"
      width="wide"
    >
      <Skeleton className="h-9 w-80" />
      <DataTableSkeleton
        columns={TIMELINE_COLUMNS}
        headings={HEADINGS}
        label="Timeline"
      />
    </PageShell>
  );
}
