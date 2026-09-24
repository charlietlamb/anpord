export const evalKeys = {
  all: ["evals"] as const,
  detail: (id: string) => [...evalKeys.all, "detail", id] as const,
  tail: (id: string) => [...evalKeys.all, "tail", id] as const,
  subscription: (id: string) => [...evalKeys.all, "subscription", id] as const,
  caseLists: () => [...evalKeys.all, "cases"] as const,
  cases: (tag: string | null, cursor: { readonly id: string } | null) =>
    [...evalKeys.caseLists(), tag ?? "all", cursor?.id ?? "first"] as const,
  case: (id: string) => [...evalKeys.all, "case", id] as const,
  caseHistory: (caseId: string, cellKey: string | null, page: number) =>
    [...evalKeys.case(caseId), "history", cellKey ?? "all", page] as const,
  trialAddress: (id: string) => [...evalKeys.all, "trial-address", id] as const,
} as const;
