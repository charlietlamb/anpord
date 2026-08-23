import type { PromptSummary } from "@anpord/schema/domain/prompts";
import { RowList } from "@/components/layout/row-list";
import { ShowMore } from "@/components/layout/show-more";
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
      <RowList label="Prompts" onKeyDown={nav.onKeyDown} role="listbox">
        {prompts.map((prompt, index) => (
          <PromptRow
            key={prompt.id}
            onMouseEnter={() => nav.setActiveIndex(index)}
            prompt={prompt}
            ref={nav.registerRow(index)}
            tabIndex={index === nav.activeIndex ? 0 : -1}
          />
        ))}
      </RowList>

      <ShowMore
        className="self-start"
        hasMore={hasMore}
        label="Show more"
        loading={loadingMore}
        onMore={onLoadMore}
      />
    </div>
  );
}
