"use client";

import { FieldShell } from "@anpord/ui/components/form/field-shell";
import { Textarea } from "@anpord/ui/components/ui/textarea";
import { useFieldContext } from "@anpord/ui/hooks/form-context";

export function TextareaField({
  description,
  label,
  placeholder,
  rows = 3,
}: {
  readonly description?: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly rows?: number;
}) {
  const field = useFieldContext<string>();

  return (
    <FieldShell description={description} field={field} label={label}>
      <Textarea
        className="min-h-0 resize-y text-sm"
        id={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={field.state.value}
      />
    </FieldShell>
  );
}
