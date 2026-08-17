export const deploymentKeys = {
  all: ["deployments"] as const,
  /** The rail reads one prompt's history, and a promotion anywhere invalidates
   * every one of them through the shared prefix. */
  forPrompt: (promptId: string) =>
    [...deploymentKeys.all, "prompt", promptId] as const,
} as const;
