import { Button } from "@anpord/ui/components/button";
import { Skeleton } from "@anpord/ui/components/skeleton";
import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { PlusIcon } from "@phosphor-icons/react";
import { DetailRow } from "@/components/prompts/detail-row";
import { UsageCard } from "@/components/prompts/usage-card";
import { VersionListSkeleton } from "@/components/prompts/version-list-skeleton";
import { RailSection } from "@/components/rail/rail-section";

const DETAIL_LABELS = ["Identifier", "Created", "Last saved"];
const CHANNEL_ROWS = ["production", "staging"];

interface PromptRailSkeletonProps {
  /** Known from the address, so the usage snippet never has to wait. */
  readonly promptId: string;
}

/**
 * The rail's labels and spacing are known before the fetch, so only the values
 * inside them are placeheld and the sections keep their final geometry.
 */
export function PromptRailSkeleton({ promptId }: PromptRailSkeletonProps) {
  return (
    <aside className="order-2 flex min-h-0 flex-col gap-6 overflow-y-auto pb-24">
      <RailSection action={<Skeleton className="h-3.5 w-4" />} title="Versions">
        <VersionListSkeleton />
      </RailSection>

      <RailSection className="flex flex-col" title="Channels">
        {CHANNEL_ROWS.map((channel) => (
          <div
            className="flex h-7 items-center justify-between gap-2"
            key={channel}
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-6" />
          </div>
        ))}
        <Button
          className={cn(
            BLEED_ROW,
            "h-7 justify-start gap-2 rounded-md font-normal text-label text-muted-foreground"
          )}
          disabled
          variant="ghost"
        >
          <PlusIcon className="size-3.5 opacity-60" />
          New channel
        </Button>
      </RailSection>

      <RailSection className="grid gap-2.5" title="Details">
        {DETAIL_LABELS.map((label) => (
          <DetailRow key={label} label={label}>
            <Skeleton className="ml-auto h-3.5 w-24" />
          </DetailRow>
        ))}
      </RailSection>

      <UsageCard promptId={promptId} />
    </aside>
  );
}
