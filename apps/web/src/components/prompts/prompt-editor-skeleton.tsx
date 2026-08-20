import { ComposerSurface } from "@anpord/ui/components/composer";
import { Skeleton } from "@anpord/ui/components/skeleton";
import { CopyableId } from "@anpord/ui/components/ui/copyable-id";
import { PromptEditorActions } from "@/components/prompts/prompt-editor-actions";
import { PromptEditorLayout } from "@/components/prompts/prompt-editor-layout";
import { PromptRailSkeleton } from "@/components/prompts/prompt-rail-skeleton";
import { SkeletonLines } from "@/components/prompts/skeleton-lines";

const BODY_LINES = ["w-[92%]", "w-[74%]", "w-[97%]", "w-[38%]"];

interface PromptEditorSkeletonProps {
  /** The address already names the prompt, so the id copies while it loads. */
  readonly promptId: string;
}

const NOTHING_YET = () => undefined;

/**
 * The page's chrome is known before the fetch, so it renders in place and only
 * the values arriving from the server are placeheld.
 */
export function PromptEditorSkeleton({ promptId }: PromptEditorSkeletonProps) {
  return (
    <PromptEditorLayout
      actions={
        <PromptEditorActions
          correctingVersion={null}
          dirty={false}
          onCancelCorrection={NOTHING_YET}
          onEditDetails={NOTHING_YET}
          onSave={NOTHING_YET}
          saving={false}
        />
      }
    >
      <main className="relative flex min-w-0 flex-col">
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
