import type { HarnessUsage } from "@anpord/schema/domain/harness-event";

const countOf = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

/* A `jsonb` column holds whatever was written, so the required fields are
   checked; cache counts default because rows predate them. */
export const usageOf = (
  value: Record<string, number> | null | undefined
): HarnessUsage | null => {
  /* Loose, so an absent column reads the same as an explicitly null one. */
  if (value == null) {
    return null;
  }

  const { inputTokens, outputTokens, totalTokens } = value;

  return typeof inputTokens === "number" &&
    typeof outputTokens === "number" &&
    typeof totalTokens === "number"
    ? {
        cacheReadTokens: countOf(value.cacheReadTokens),
        cacheWriteTokens: countOf(value.cacheWriteTokens),
        /* Undefined rather than zero: unknown is not free. */
        costUsd:
          typeof value.costUsd === "number" && Number.isFinite(value.costUsd)
            ? value.costUsd
            : undefined,
        inputTokens,
        outputTokens,
        totalTokens,
      }
    : null;
};
