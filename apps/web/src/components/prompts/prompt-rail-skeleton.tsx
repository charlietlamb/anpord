import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";
import {
  ClockCounterClockwiseIcon,
  FloppyDiskIcon,
  HashIcon,
} from "@phosphor-icons/react";
import { DetailRow } from "@/components/prompts/detail-row";
import { PromptEditorActions } from "@/components/prompts/prompt-editor-actions";
import { VersionListSkeleton } from "@/components/prompts/version-list-skeleton";
import { RailSection } from "@/components/rail/rail-section";

const NOTHING_YET = () => undefined;

const DETAIL_ROWS = [
  { icon: HashIcon, label: "Identifier", width: "w-28" },
  { icon: ClockCounterClockwiseIcon, label: "Created", width: "w-20" },
  { icon: FloppyDiskIcon, label: "Last saved", width: "w-24" },
];

/**
 * The rail's labels and spacing are known before the fetch, so only the values
 * inside them are placeheld and the sections keep their final geometry.
 */
export function PromptRailSkeleton() {
  return (
    <aside className="no-scrollbar order-2 flex flex-col gap-6 lg:sticky lg:top-0 lg:h-svh lg:overflow-y-auto lg:overflow-x-clip lg:overscroll-contain lg:pt-5 lg:pb-8">
      <div className="flex justify-end">
        <PromptEditorActions
          correctingVersion={null}
          dirty={false}
          onCancelCorrection={NOTHING_YET}
          onSave={NOTHING_YET}
          saving={false}
        />
      </div>

      <RailSection className="flex flex-col" title="Details">
        {DETAIL_ROWS.map((row) => (
          <DetailRow icon={row.icon} key={row.label} label={row.label}>
            <Skeleton className={cn("h-3", row.width)} />
          </DetailRow>
        ))}
      </RailSection>

      <RailSection action={<Skeleton className="h-3.5 w-4" />} title="Versions">
        <VersionListSkeleton />
      </RailSection>
    </aside>
  );
}
