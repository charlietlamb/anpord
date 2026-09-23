import type { EvalCellHistoryEntry } from "@anpord/schema/domain/evals";
import { useQueryState } from "nuqs";
import { useCasePage } from "@/lib/evals/use-case-page";

export const useSelectedVariant = (
  variants: readonly EvalCellHistoryEntry[]
) => {
  const [cellKey, setCellKey] = useQueryState("variant");
  const [, setPage] = useCasePage();

  return {
    select: (next: string | null) => {
      setCellKey(next);
      setPage(null);
    },
    selected: variants.find((entry) => entry.cellKey === cellKey),
  };
};
