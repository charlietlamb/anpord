import type { RailIcon } from "@anpord/ui/components/ui/rail-fact";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@anpord/ui/components/ui/select";
import { XIcon } from "@phosphor-icons/react";
import type { VariantOption } from "@/lib/evals/variant-options";

/**
 * One axis of the matrix: every model, or every sandbox, that a run should
 * cross.
 *
 * A multi-select rather than a row of pairs, because a column is every pairing
 * of the two axes and asking for the pairs one at a time asks a person to do
 * the multiplication by hand. Three models against two sandboxes is two
 * gestures here and six rows in the other design.
 *
 * Each chip carries its own mark, so a list of selections reads as the things
 * themselves rather than as strings that happen to name them.
 */
export function VariantPicker<TValue extends string>({
  emptyLabel,
  iconOf,
  label,
  onChange,
  options,
  value,
}: {
  readonly emptyLabel: string;
  readonly iconOf?: (value: TValue) => RailIcon;
  readonly label: string;
  readonly onChange: (next: TValue[]) => void;
  readonly options: readonly VariantOption<TValue>[];
  readonly value: readonly TValue[];
}) {
  const labelOf = (item: TValue) =>
    options.find((option) => option.value === item)?.label ?? item;

  const remove = (item: TValue) =>
    onChange(value.filter((each) => each !== item));

  return (
    <Select
      items={[...options]}
      multiple
      onValueChange={(next) => onChange(next as TValue[])}
      value={[...value]}
    >
      <SelectTrigger
        aria-label={label}
        className="h-auto min-h-9 w-full py-1.5"
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground text-sm">{emptyLabel}</span>
        ) : (
          <div className="flex flex-1 flex-wrap items-center gap-1">
            {value.map((item) => {
              const Icon = iconOf?.(item);

              return (
                <span
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted py-0.5 pr-1 pl-2 text-xs"
                  key={item}
                >
                  {Icon ? <Icon className="size-3 shrink-0" /> : null}
                  {labelOf(item)}
                  <button
                    aria-label={`Remove ${labelOf(item)}`}
                    className="rounded-sm text-muted-foreground/70 hover:text-foreground"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      remove(item);
                    }}
                    type="button"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </SelectTrigger>

      <SelectContent>
        {options.map((option) => {
          const Icon = iconOf?.(option.value);

          return (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex min-w-0 items-center gap-2">
                {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
                <span className="min-w-0">
                  <span className="block truncate">{option.label}</span>
                  <span className="block truncate text-muted-foreground text-xs">
                    {option.description}
                  </span>
                </span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
