import type { EvalCellHistoryEntry } from "@anpord/schema/domain/evals";
import { useQueryState } from "nuqs";

export const useSelectedVariant = (
  variants: readonly EvalCellHistoryEntry[]
) => {
  const [cellKey, select] = useQueryState("variant");

  return {
    select,
    selected: variants.find((entry) => entry.cellKey === cellKey),
  };
};
