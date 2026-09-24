import type { PromptSummary } from "@anpord/schema/domain/prompts";
import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
} from "@anpord/ui/components/ui/data-table";
import { ShowMore } from "@/components/layout/show-more";
import { PromptRow } from "@/components/prompts/prompt-row";
import { counted } from "@/lib/evals/conversation";
import { PROMPTS_TABLE } from "@/lib/prompts/prompt-tables";

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
    <DataTable columns={PROMPTS_TABLE.columns} label={PROMPTS_TABLE.label}>
      <DataTableHead headings={PROMPTS_TABLE.headings} />
      <DataTableBody>
        {prompts.map((prompt) => (
          <PromptRow key={prompt.id} prompt={prompt} />
        ))}
      </DataTableBody>
      <DataTableFooter
        actions={
          <ShowMore
            hasMore={hasMore}
            label="Show more"
            loading={loadingMore}
            onMore={onLoadMore}
          />
        }
      >
        Showing {counted(prompts.length, "prompt", "prompts")}
      </DataTableFooter>
    </DataTable>
  );
}
