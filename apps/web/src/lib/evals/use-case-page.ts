import { parseAsInteger, useQueryState } from "nuqs";

export const useCasePage = () =>
  useQueryState("page", parseAsInteger.withDefault(1));
