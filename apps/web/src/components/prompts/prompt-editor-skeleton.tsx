import { ComposerSurface } from "@anpord/ui/components/composer";
import { Skeleton } from "@anpord/ui/components/skeleton";
import { CopyableId } from "@anpord/ui/components/ui/copyable-id";
import { cn } from "@anpord/ui/lib/utils";
import { PromptEditorLayout } from "@/components/prompts/prompt-editor-layout";
import { PromptEditorMain } from "@/components/prompts/prompt-editor-main";
import { PromptRailSkeleton } from "@/components/prompts/prompt-rail-skeleton";

const BODY_LINES = ["w-11/12", "w-3/4", "w-full", "w-2/5"];

interface PromptEditorSkeletonProps {
  readonly promptId: string;
}

export function PromptEditorSkeleton({ promptId }: PromptEditorSkeletonProps) {
  return (
    <PromptEditorLayout>
      <PromptEditorMain>
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Skeleton className="h-7 w-44" />
          <CopyableId className="shrink-0" value={promptId} />
        </div>

        <ComposerSurface>
          <div className="flex flex-col gap-3.5 py-1">
            {BODY_LINES.map((width) => (
              <Skeleton className={cn("h-3.5", width)} key={width} />
            ))}
          </div>
        </ComposerSurface>
      </PromptEditorMain>

      <PromptRailSkeleton promptId={promptId} />
    </PromptEditorLayout>
  );
}
