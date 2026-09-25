import { parseAsString, parseAsStringLiteral } from "nuqs";

const SEARCH_THROTTLE_MS = 250;

export const CASE_SORT_OPTIONS = [
  { label: "Last run", value: "recent" },
  { label: "Name", value: "name" },
] as const;

export const caseListParsers = {
  q: parseAsString
    .withDefault("")
    .withOptions({ clearOnDefault: true, throttleMs: SEARCH_THROTTLE_MS }),
  order: parseAsStringLiteral(["asc", "desc"] as const)
    .withDefault("desc")
    .withOptions({ clearOnDefault: true }),
  sort: parseAsStringLiteral(CASE_SORT_OPTIONS.map((option) => option.value))
    .withDefault("recent")
    .withOptions({ clearOnDefault: true }),
  suite: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  tag: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
};
