import type { PromptSummary } from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { PromptRow } from "@/components/prompts/prompt-row";

interface PromptListProps {
  readonly hasMore: boolean;
  readonly loadingMore: boolean;
  readonly onLoadMore: () => void;
  readonly prompts: readonly PromptSummary[];
  readonly search: string;
}

/** An account with no prompts and a search that matched nothing look the same
 * on screen but mean opposite things, so they are never phrased alike. */
function NoPrompts({ search }: { readonly search: string }) {
  return (
    <div className="rounded-xl border border-border-surface border-dashed px-6 py-14 text-center">
      <p className="font-heading text-base tracking-tight">
        {search ? "No matching prompts" : "No prompts yet"}
      </p>
      <p className="mt-1 text-muted-foreground text-sm">
        {search
          ? `Nothing matches “${search}”.`
          : "Create one to start versioning what your application sends."}
      </p>
    </div>
  );
}

export function PromptList({
  hasMore,
  loadingMore,
  onLoadMore,
  prompts,
  search,
}: PromptListProps) {
  if (prompts.length === 0) {
    return <NoPrompts search={search} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-xl border border-border-surface bg-sidebar-accent/50",
          ROW_DIVIDERS
        )}
      >
        {prompts.map((prompt) => (
          <PromptRow key={prompt.id} prompt={prompt} />
        ))}
      </div>

      {hasMore ? (
        <Button
          className="self-center"
          disabled={loadingMore}
          onClick={onLoadMore}
          size="sm"
          variant="outline"
        >
          {loadingMore ? (
            <SpinnerGapIcon className="animate-spin" size={15} />
          ) : null}
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
