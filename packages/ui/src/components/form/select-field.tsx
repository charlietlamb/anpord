"use client";

import { FieldInfo } from "@anpord/ui/components/form/field-info";
import { LabelledSelect } from "@anpord/ui/components/form/labelled-select";
import { useFieldContext } from "@anpord/ui/hooks/form-context";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label: string;
  options: SelectOption[];
  placeholder?: string;
}

export function SelectField({ label, options, placeholder }: SelectFieldProps) {
  const field = useFieldContext<string>();

  return (
    <div className="grid gap-2">
      <LabelledSelect
        id={field.name}
        label={label}
        onChange={(value) => field.handleChange(value)}
        options={options}
        placeholder={placeholder}
        size="lg"
        value={field.state.value}
      />
      <FieldInfo field={field} />
    </div>
  );
}
