import type { HarnessUsage } from "@sphynx/schema/domain/harness-event";

export const promptInclusiveUsage = (counts: {
  readonly cached: number;
  readonly output: number;
  readonly prompt: number;
  readonly total: number | undefined;
}): HarnessUsage => {
  const total = counts.total ?? counts.prompt + counts.output;

  return {
    cacheReadTokens: counts.cached,
    cacheWriteTokens: 0,
    inputTokens: Math.max(counts.prompt - counts.cached, 0),
    outputTokens: Math.max(total - counts.prompt, counts.output),
    totalTokens: total,
  };
};
