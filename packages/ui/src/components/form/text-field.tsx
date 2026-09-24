"use client";

import { FieldShell } from "@anpord/ui/components/form/field-shell";
import { Input } from "@anpord/ui/components/input";
import { useFieldContext } from "@anpord/ui/hooks/form-context";

interface TextFieldProps {
  autoComplete?: string;
  description?: string;
  hideLabel?: boolean;
  label: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
}

export function TextField({
  description,
  hideLabel = false,
  label,
  type = "text",
  placeholder,
  autoComplete,
  onValueChange,
}: TextFieldProps) {
  const field = useFieldContext<string>();

  return (
    <FieldShell
      description={description}
      field={field}
      hideLabel={hideLabel}
      label={label}
    >
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
    </FieldShell>
  );
}
