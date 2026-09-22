const MAX = 100;

/* Matches EvalCaseId: lowercase, digits, single hyphens, never leading or
   trailing. A name that slugs to nothing keeps the fallback rather than
   producing an id no one can type. */
export const caseSlugOf = (name: string, fallback: string): string => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX)
    .replace(/-+$/g, "");

  return slug === "" ? fallback : slug;
};
