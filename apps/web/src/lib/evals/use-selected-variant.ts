import type { EvalVariantResult } from "@anpord/schema/domain/evals";
import { useQueryState } from "nuqs";
import { useCasePage } from "@/lib/evals/use-case-page";

export const useSelectedVariant = (variants: readonly EvalVariantResult[]) => {
  const [variantId, setVariantId] = useQueryState("variant");
  const [, setPage] = useCasePage();

  return {
    select: (next: string | null) => {
      setVariantId(next);
      setPage(null);
    },
    selected: variants.find((entry) => entry.variant.id === variantId),
  };
};
