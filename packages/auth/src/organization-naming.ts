const SLUG_MAX = 32;

export const displayName = (name: string | null, email: string) =>
  name?.trim() || email.split("@")[0] || "Workspace";

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SLUG_MAX) || "workspace";
