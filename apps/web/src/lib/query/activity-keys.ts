export const activityKeys = {
  all: ["activity"] as const,
  forPrompt: (promptId: string) =>
    [...activityKeys.all, "prompt", promptId] as const,
} as const;
