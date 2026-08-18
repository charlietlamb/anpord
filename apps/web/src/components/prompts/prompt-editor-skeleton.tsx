import { Button } from "@anpord/ui/components/button";
import { ComposerSurface } from "@anpord/ui/components/composer";
import { Skeleton } from "@anpord/ui/components/skeleton";
import { CopyableId } from "@anpord/ui/components/ui/copyable-id";
import { ShortcutButton } from "@anpord/ui/components/ui/shortcut-button";
import { ArrowUpIcon } from "@phosphor-icons/react";
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
    <PromptEditorLayout
      header={
        <header className="flex w-full shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-6 w-44" />
            <CopyableId className="shrink-0" value={promptId} />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button disabled size="sm" variant="outline">
              Edit details
            </Button>
            <ShortcutButton
              className="h-[1.875rem]"
              disabled
              metaShortcut="enter"
              size="sm"
            >
              <ArrowUpIcon size={15} weight="bold" />
              Save version
            </ShortcutButton>
          </div>
        </header>
      }
    >
      <main className="relative flex min-h-[20rem] min-w-0 flex-col lg:sticky lg:top-4 lg:h-[calc(100svh-8.5rem)]">
        <div className="flex w-full flex-col">
          <ComposerSurface className="min-h-[24rem]">
            <SkeletonLines
              className="gap-3.5 px-4 pt-4 pb-2"
              widths={BODY_LINES}
            />
          </ComposerSurface>
        </div>
      </main>

      <PromptRailSkeleton promptId={promptId} />
    </PromptEditorLayout>
  );
}
