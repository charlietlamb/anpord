"use client";

import { FieldInfo } from "@anpord/ui/components/form/field-info";
import { Input } from "@anpord/ui/components/input";
import { Label } from "@anpord/ui/components/ui/label";
import { useFieldContext } from "@anpord/ui/hooks/form-context";
import { cn } from "@anpord/ui/lib/utils";

interface TextFieldProps {
  autoComplete?: string;
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
        id={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => {
          field.handleChange(event.target.value);
          onValueChange?.(event.target.value);
        }}
        placeholder={placeholder}
        size="lg"
        type={type}
        value={field.state.value}
      />
      <FieldInfo field={field} />
    </div>
  );
}
