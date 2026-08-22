"use client";

import { Button } from "@anpord/ui/components/button";
import { FieldShell } from "@anpord/ui/components/form/field-shell";
import { useFieldContext } from "@anpord/ui/hooks/form-context";
import { MinusIcon, PlusIcon } from "@phosphor-icons/react";

/** A small count with a floor and a ceiling. Stepped rather than typed: the
 * range is short enough that two buttons are fewer keystrokes than a number,
 * and neither button can leave the range. */
export function NumberField({
  description,
  label,
  max,
  min,
  suffix,
}: {
  readonly description?: string;
  readonly label: string;
  readonly max: number;
  readonly min: number;
  readonly suffix?: string;
}) {
  const field = useFieldContext<number>();
  const value = field.state.value;

  const step = (by: number) =>
    field.handleChange(Math.min(max, Math.max(min, value + by)));

  return (
    <FieldShell description={description} field={field} label={label}>
      <div className="flex items-center gap-1">
        <Button
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => step(-1)}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <MinusIcon className="size-3.5" />
        </Button>

        <span className="w-10 text-center text-sm tabular-nums">
          {value}
          {suffix}
        </span>

        <Button
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => step(1)}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <PlusIcon className="size-3.5" />
        </Button>
      </div>
    </FieldShell>
  );
}
