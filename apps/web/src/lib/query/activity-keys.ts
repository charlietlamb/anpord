/** Route params arrive as raw strings, so keys accept `string` rather than the
 * branded `PromptId`. */
export const activityKeys = {
  all: ["activity"] as const,
  forPrompt: (promptId: string) =>
    [...activityKeys.all, "prompt", promptId] as const,
} as const;
