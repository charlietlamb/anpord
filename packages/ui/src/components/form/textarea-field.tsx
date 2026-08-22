"use client";

import { FieldShell } from "@anpord/ui/components/form/field-shell";
import { Textarea } from "@anpord/ui/components/ui/textarea";
import { useFieldContext } from "@anpord/ui/hooks/form-context";

/** Prose that runs past a line: a goal, a description. Grows with its content
 * rather than scrolling inside a fixed box, because a person editing a
 * paragraph needs to see the paragraph. */
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
