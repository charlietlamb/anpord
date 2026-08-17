export const placementKeys = {
  all: ["placements"] as const,
  lists: () => [...placementKeys.all, "list"] as const,
  list: (filters: { readonly search: string }) =>
    [...placementKeys.lists(), filters] as const,
} as const;
