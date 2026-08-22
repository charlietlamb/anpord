import { Skeleton } from "@anpord/ui/components/skeleton";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { RAIL_FRAME } from "@anpord/ui/lib/rail-frame";
import { cn } from "@anpord/ui/lib/utils";
import {
  ClockCounterClockwiseIcon,
  FloppyDiskIcon,
  HashIcon,
} from "@phosphor-icons/react";
import { DetailRow } from "@/components/prompts/detail-row";
import { PromptEditorActions } from "@/components/prompts/prompt-editor-actions";
import { VersionListSkeleton } from "@/components/prompts/version-list-skeleton";

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
interface PromptRailSkeletonProps {
  /** Known from the address, so the copy controls work before the fetch. */
  readonly promptId: string;
}

export function PromptRailSkeleton({ promptId }: PromptRailSkeletonProps) {
  return (
    <aside className={RAIL_FRAME}>
      <div className="flex justify-end">
        <PromptEditorActions
          correctingVersion={null}
          dirty={false}
          onCancelCorrection={NOTHING_YET}
          onSave={NOTHING_YET}
          promptId={promptId}
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
