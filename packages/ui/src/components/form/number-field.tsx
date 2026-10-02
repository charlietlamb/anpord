"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@sphynx/ui/components/button";
import { FieldShell } from "@sphynx/ui/components/form/field-shell";
import { useFieldContext } from "@sphynx/ui/hooks/form-context";

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
