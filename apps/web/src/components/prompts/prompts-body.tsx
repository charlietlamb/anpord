import type { PromptSummary } from "@anpord/schema/domain/prompts";
import { PromptList } from "@/components/prompts/prompt-list";
import { PromptListSkeleton } from "@/components/prompts/prompt-list-skeleton";

interface PromptsBodyProps {
  readonly error: Error | null;
  readonly hasMore: boolean;
  readonly isPending: boolean;
  readonly loadingMore: boolean;
  readonly onLoadMore: () => void;
  readonly prompts: readonly PromptSummary[] | undefined;
  readonly search: string;
}

export function PromptsBody({
  error,
  hasMore,
  isPending,
  loadingMore,
  onLoadMore,
  prompts,
  search,
}: PromptsBodyProps) {
  if (isPending) {
    return (
      <div className="mt-4">
        <PromptListSkeleton />
      </div>
    );
  }

  if (error || !prompts) {
    return (
      <p className="mt-6 text-muted-foreground text-sm">
        Couldn't load your prompts. {error?.message}
      </p>
    );
  }

  return (
    <div className="mt-4">
      <PromptList
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={onLoadMore}
        prompts={prompts}
        search={search}
      />
    </div>
  );
}
