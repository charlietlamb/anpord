import type { EvalVariantResult } from "@anpord/schema/domain/evals";
import { EvalStatusBadge } from "@anpord/ui/components/evals/eval-status-badge";
import { VariantName } from "@anpord/ui/components/evals/variant-name";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@anpord/ui/components/ui/select";
import { distributionStatus } from "@anpord/ui/lib/evals/eval-status";

const ALL = "all";

export function CaseVariantMenu({
  onSelect,
  selected,
  variants,
}: {
  readonly onSelect: (variantId: string | null) => void;
  readonly selected: EvalVariantResult | undefined;
  readonly variants: readonly EvalVariantResult[];
}) {
  return (
    <Select
      onValueChange={(value) => onSelect(value === ALL ? null : value)}
      value={selected?.variant.id ?? ALL}
    >
      <SelectTrigger aria-label="Variant" className="max-w-60" size="sm">
        <SelectValue>
          {selected === undefined ? (
            "All variants"
          ) : (
            <VariantName
              harness={selected.variant.harness}
              model={selected.variant.model}
            />
          )}
        </SelectValue>
      </SelectTrigger>

      <SelectContent align="end" className="w-80">
        <SelectItem className="pr-8" value={ALL}>
          All variants
        </SelectItem>

        {variants.map((entry) => (
          <SelectItem
            className="pr-8"
            key={entry.variant.id}
            value={entry.variant.id}
          >
            <VariantName
              harness={entry.variant.harness}
              model={entry.variant.model}
            />
            <span className="ml-auto">
              <EvalStatusBadge
                size="xs"
                status={distributionStatus(entry.distribution)}
              />
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
