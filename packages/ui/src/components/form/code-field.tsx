"use client";

import { FieldInfo } from "@anpord/ui/components/form/field-info";
import { Label } from "@anpord/ui/components/ui/label";
import { Textarea } from "@anpord/ui/components/ui/textarea";
import { useFieldContext } from "@anpord/ui/hooks/form-context";
import { cn } from "@anpord/ui/lib/utils";

interface CodeFieldProps {
  readonly hint?: string;
  readonly label: string;
  readonly rows?: number;
}

/**
 * A monospaced field for source the user edits by hand.
 *
 * A plain `Textarea` outside the form system loses the label association, the
 * blur handling and the error line that every other field gets for free, so
 * code that is part of a form belongs in a field like any other value.
 */
export function CodeField({ hint, label, rows = 6 }: CodeFieldProps) {
  const field = useFieldContext<string>();

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <Label className="font-mono text-xs" htmlFor={field.name}>
          {label}
        </Label>
        {hint === undefined ? null : (
          <span className="text-muted-foreground text-xs">{hint}</span>
        )}
      </div>

      <Textarea
        className={cn(
          "resize-y font-mono text-xs leading-relaxed",
          /* Tabs read as eight columns by default, which makes two levels of
             indentation wider than the field. */
          "[tab-size:2]"
        )}
        id={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        rows={rows}
        spellCheck={false}
        value={field.state.value}
      />

      <FieldInfo field={field} />
    </div>
  );
}
