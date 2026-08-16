import type {
  PromptSortOrder,
  PromptStatusFilter,
} from "@anpord/schema/domain/prompts";

export interface PromptListFilters {
  readonly search: string;
  readonly sort: PromptSortOrder;
  readonly status: PromptStatusFilter;
}
