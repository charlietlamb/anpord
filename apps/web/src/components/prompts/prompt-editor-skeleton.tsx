import { ComposerSurface } from "@anpord/ui/components/composer";
import { Skeleton } from "@anpord/ui/components/skeleton";
import { CopyableId } from "@anpord/ui/components/ui/copyable-id";
import { PromptEditorLayout } from "@/components/prompts/prompt-editor-layout";
import { PromptRailSkeleton } from "@/components/prompts/prompt-rail-skeleton";
import { SkeletonLines } from "@/components/prompts/skeleton-lines";

const BODY_LINES = ["w-[92%]", "w-[74%]", "w-[97%]", "w-[38%]"];

interface PromptEditorSkeletonProps {
  /** The address already names the prompt, so the id copies while it loads. */
  readonly promptId: string;
}

/**
 * The page's chrome is known before the fetch, so it renders in place and only
 * the values arriving from the server are placeheld.
 */
export function PromptEditorSkeleton({ promptId }: PromptEditorSkeletonProps) {
  return (
    <PromptEditorLayout>
      <main className="relative flex min-w-0 flex-col pt-5 pb-24">
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Skeleton className="h-7 w-44" />
          <CopyableId className="shrink-0" value={promptId} />
        </div>

        <ComposerSurface>
          <SkeletonLines className="gap-3.5 py-1" widths={BODY_LINES} />
        </ComposerSurface>
      </main>

      <PromptRailSkeleton promptId={promptId} />
    </PromptEditorLayout>
  );
}
