const MARKS = /\p{M}/gu;
const OUTSIDE_SLUG = /[^a-z0-9]+/g;
const EDGE_HYPHENS = /^-+|-+$/g;
const ID_LIMIT = 100;

export const suiteIdOf = (name: string) =>
  name
    .normalize("NFKD")
    .replace(MARKS, "")
    .toLowerCase()
    .replace(OUTSIDE_SLUG, "-")
    .replace(EDGE_HYPHENS, "")
    .slice(0, ID_LIMIT)
    .replace(EDGE_HYPHENS, "");
