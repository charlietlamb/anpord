export const SCOPE_OPTIONS = [
  { label: "Everyone in the organization", value: "organization" },
  { label: "Only me", value: "personal" },
] as const;

export const scopeOf = (value: string) =>
  value === "personal" ? "personal" : "organization";

export const scopeLabel = (scope: string) =>
  scope === "personal" ? "Only you" : "Organization";
