import {
  createLoader,
  type inferParserType,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";

const SEARCH_THROTTLE_MS = 250;

export const PROMPT_SORT_OPTIONS = [
  { label: "Recently updated", value: "updated" },
  { label: "Name", value: "name" },
] as const;

export const promptListParsers = {
  q: parseAsString
    .withDefault("")
    .withOptions({ clearOnDefault: true, throttleMs: SEARCH_THROTTLE_MS }),
  sort: parseAsStringLiteral(PROMPT_SORT_OPTIONS.map((option) => option.value))
    .withDefault("updated")
    .withOptions({ clearOnDefault: true }),
};

export const loadPromptListFilters = createLoader(promptListParsers);

export type PromptListFilters = inferParserType<typeof promptListParsers>;
