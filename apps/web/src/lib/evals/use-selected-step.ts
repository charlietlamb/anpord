import { parseAsInteger, useQueryState } from "nuqs";

export const useSelectedStep = () => useQueryState("step", parseAsInteger);
