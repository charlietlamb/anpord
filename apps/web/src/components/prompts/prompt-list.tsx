import type { PromptSummary } from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { PromptRow } from "@/components/prompts/prompt-row";
import { useListKeyboardNav } from "@/lib/use-list-keyboard-nav";

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
  const nav = useListKeyboardNav(prompts.length);

  return (
    <div className="flex flex-col gap-3">
      {/* No rules between the rows: they are the same shape repeated, and the
          highlight that follows the pointer is what separates one from the
          next. */}
      <div
        aria-label="Prompts"
        className="flex flex-col"
        onKeyDown={nav.onKeyDown}
        role="listbox"
        tabIndex={-1}
      >
        {prompts.map((prompt, index) => (
          <PromptRow
            key={prompt.id}
            onMouseEnter={() => nav.setActiveIndex(index)}
            prompt={prompt}
            ref={nav.registerRow(index)}
            tabIndex={index === nav.activeIndex ? 0 : -1}
          />
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
