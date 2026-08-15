const SLUG_MAX = 32;

/** Personal orgs are named after their owner, so the workspace reads as theirs. */
export const displayName = (name: string | null, email: string) =>
  name?.trim() || email.split("@")[0] || "Workspace";

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SLUG_MAX) || "workspace";
