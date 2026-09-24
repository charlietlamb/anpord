import { PromptActivityPage } from "@anpord/schema/domain/prompt-activity";
import type { PromptEventKind } from "@anpord/schema/domain/prompt-events";
import { createApiClient, searchOf } from "@/lib/api-client";

const api = createApiClient("/api/activity");

export interface ActivityFilters {
  readonly channel?: string;
  readonly cursor?: string;
  readonly kind?: PromptEventKind;
  readonly limit?: number;
  readonly prompt?: string;
}

export const listActivity = (
  filters: ActivityFilters = {}
): Promise<PromptActivityPage> =>
  api.request(PromptActivityPage, searchOf({ ...filters }));
