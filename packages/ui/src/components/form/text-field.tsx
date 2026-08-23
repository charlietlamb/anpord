"use client";

import { FieldInfo } from "@anpord/ui/components/form/field-info";
import { Input } from "@anpord/ui/components/input";
import { Label } from "@anpord/ui/components/ui/label";
import { useFieldContext } from "@anpord/ui/hooks/form-context";
import { cn } from "@anpord/ui/lib/utils";

interface TextFieldProps {
  autoComplete?: string;
  /** Hides the label without removing it. For a field whose placeholder says
   * what it is and whose form has one input, where a written label repeats the
   * heading above it. The label still reaches a screen reader. */
  hideLabel?: boolean;
  label: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
}

export function TextField({
  hideLabel = false,
  label,
  type = "text",
  placeholder,
  autoComplete,
  onValueChange,
}: TextFieldProps) {
  const field = useFieldContext<string>();

  return (
    <div className="grid gap-2">
      <Label className={cn(hideLabel && "sr-only")} htmlFor={field.name}>
        {label}
      </Label>
      <Input
        autoComplete={autoComplete}
        className="h-10 px-3 text-sm md:text-sm"
        id={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => {
          field.handleChange(event.target.value);
          onValueChange?.(event.target.value);
        }}
        placeholder={placeholder}
        type={type}
        value={field.state.value}
      />
      <FieldInfo field={field} />
    </div>
  );
}
