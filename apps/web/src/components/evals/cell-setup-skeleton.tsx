import { Skeleton } from "@anpord/ui/components/skeleton";
import { TextAlignLeftIcon } from "@phosphor-icons/react";
import { SetupSurface } from "./setup-surface";

/* Prose settles into a block of full lines with a short last one, so the
   skeleton reads as a paragraph rather than a stack of equal bars. */
const LINES = ["w-full", "w-full", "w-4/5", "w-2/3"];

export function CellSetupSkeleton() {
  return (
    <SetupSurface Icon={TextAlignLeftIcon} title="Prompt">
      <div className="flex max-w-prose flex-col gap-2.5">
        {LINES.map((width, index) => (
          <Skeleton
            className={`h-3.5 ${width}`}
            key={`line-${index satisfies number}`}
          />
        ))}
      </div>
    </SetupSurface>
  );
}
