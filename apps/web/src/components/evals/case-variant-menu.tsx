import type { EvalCellHistoryEntry } from "@anpord/schema/domain/evals";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@anpord/ui/components/ui/select";
import { DistributionPill } from "@/components/evals/eval-status-badge";
import { VariantName } from "@/components/evals/variant-name";

const ALL = "all";

export function CaseVariantMenu({
  onSelect,
  selected,
  variants,
}: {
  readonly onSelect: (cellKey: string | null) => void;
  readonly selected: EvalCellHistoryEntry | undefined;
  readonly variants: readonly EvalCellHistoryEntry[];
}) {
  return (
    <Select
      onValueChange={(value) => onSelect(value === ALL ? null : value)}
      value={selected?.cellKey ?? ALL}
    >
      <SelectTrigger aria-label="Variant" className="max-w-60" size="sm">
        <SelectValue>
          {selected === undefined ? (
            "All variants"
          ) : (
            <VariantName harness={selected.harness} model={selected.model} />
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
            key={entry.cellKey}
            value={entry.cellKey}
          >
            <VariantName harness={entry.harness} model={entry.model} />
            <span className="ml-auto">
              <DistributionPill distribution={entry.distribution} size="xs" />
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
