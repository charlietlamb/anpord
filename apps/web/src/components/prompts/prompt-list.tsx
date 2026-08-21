import type { PromptSummary } from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { PromptRow } from "@/components/prompts/prompt-row";

interface PromptListProps {
  readonly hasMore: boolean;
  readonly loadingMore: boolean;
  readonly onLoadMore: () => void;
  readonly prompts: readonly PromptSummary[];
}

export function PromptList({
  hasMore,
  loadingMore,
  onLoadMore,
  prompts,
}: PromptListProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* No rules between the rows: they are the same shape repeated, and the
          highlight that follows the pointer is what separates one from the
          next. */}
      <div className="flex flex-col">
        {prompts.map((prompt) => (
          <PromptRow key={prompt.id} prompt={prompt} />
        ))}
      </div>

      {hasMore ? (
        <Button
          className="self-start"
          disabled={loadingMore}
          onClick={onLoadMore}
          size="sm"
          variant="bare"
        >
          {loadingMore ? (
            <SpinnerGapIcon className="animate-spin" size={15} />
          ) : null}
          {loadingMore ? "Loading…" : "Show more"}
        </Button>
      ) : null}
    </div>
  );
}
