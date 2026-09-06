"use client";

import { FieldShell } from "@anpord/ui/components/form/field-shell";
import { ShellBlock } from "@anpord/ui/components/ui/shell-block";
import { useFieldContext } from "@anpord/ui/hooks/form-context";

/* A transparent textarea over a `ShellBlock`; the two layers must share font,
   size and line height to keep the caret over its own character. */
export function ShellField({
  description,
  label,
  placeholder,
  rows = 8,
}: {
  readonly description?: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly rows?: number;
}) {
  const field = useFieldContext<string>();
  const value = field.state.value ?? "";

  return (
    <FieldShell description={description} field={field} label={label}>
      <div className="relative rounded-md border border-input bg-input/20 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
        <div aria-hidden="true">
          <ShellBlock
            className="pointer-events-none min-h-full border-0 bg-transparent"
            command={value === "" ? (placeholder ?? "") : value}
            copyable={false}
            tone="plain"
          />
        </div>

        <textarea
          className="absolute inset-0 resize-none overflow-auto whitespace-pre-wrap break-all rounded-md bg-transparent px-3 py-2.5 font-mono text-transparent text-xs leading-relaxed caret-foreground outline-none"
          id={field.name}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
          rows={rows}
          spellCheck={false}
          value={value}
        />
      </div>
    </FieldShell>
  );
}
