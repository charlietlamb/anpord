import type { RerunSlot } from "@anpord/schema/domain/eval-rerun";
import { VariantCell } from "@anpord/ui/components/evals/variant-cell";
import { Badge } from "@anpord/ui/components/ui/badge";
import { DataTableRow } from "@anpord/ui/components/ui/data-table";

export function RerunPreviewRow({ slot }: { readonly slot: RerunSlot }) {
  const { variant } = slot;

  return (
    <DataTableRow>
      <span className="min-w-0 truncate">{slot.caseName}</span>

      {variant.kind === "existing" ? (
        <VariantCell
          harness={variant.variant.harness}
          model={variant.variant.model}
        />
      ) : (
        <VariantCell harness={variant.harness} model={variant.model} />
      )}

      <span>
        {variant.kind === "fresh" ? (
          <Badge size="xs" variant="outline">
            New variant
          </Badge>
        ) : null}
      </span>
    </DataTableRow>
  );
}
