import { Button } from "@anpord/ui/components/button";
import { Skeleton } from "@anpord/ui/components/skeleton";
import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";
import { PlusIcon } from "@phosphor-icons/react";
import { DetailRow } from "@/components/prompts/detail-row";
import { RailCard } from "@/components/prompts/rail-card";
import { UsageCard } from "@/components/prompts/usage-card";
import { VersionListSkeleton } from "@/components/prompts/version-list-skeleton";

const DETAIL_LABELS = ["Identifier", "Created", "Last saved"];
const CHANNEL_ROWS = ["production", "staging"];

interface PromptRailSkeletonProps {
  /** Known from the address, so the usage snippet never has to wait. */
  readonly promptId: string;
}

/**
 * The rail's frames and labels are known before the fetch, so only the values
 * inside them are placeheld and the cards keep their final geometry.
 */
export function PromptRailSkeleton({ promptId }: PromptRailSkeletonProps) {
  return (
    <aside className="order-2 flex flex-col gap-3">
      <RailCard
        action={<Skeleton className="h-4 w-5 rounded-full" />}
        className="px-0 py-0"
        title="Versions"
      >
        <VersionListSkeleton />
      </RailCard>

      <RailCard
        className={cn("flex flex-col px-0 py-0", ROW_DIVIDERS)}
        title="Channels"
      >
        {CHANNEL_ROWS.map((channel) => (
          <div
            className="flex h-8 items-center justify-between gap-2 px-3.5"
            key={channel}
          >
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-6" />
          </div>
        ))}
        <Button
          className="h-8 w-full justify-start gap-2 rounded-none px-3.5 font-normal text-[0.8125rem] text-muted-foreground"
          disabled
          variant="ghost"
        >
          <PlusIcon className="size-3.5" />
          New channel
        </Button>
      </RailCard>

      <RailCard className="grid gap-2.5" title="Details">
        {DETAIL_LABELS.map((label) => (
          <DetailRow key={label} label={label}>
            <Skeleton className="ml-auto h-3.5 w-24" />
          </DetailRow>
        ))}
      </RailCard>

      <UsageCard promptId={promptId} />
    </aside>
  );
}
