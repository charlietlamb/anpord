import { LabelledField } from "@anpord/ui/components/form/labelled-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@anpord/ui/components/ui/select";
import type { ReactNode } from "react";

export function LabelledSelect({
  className,
  id,
  label,
  onChange,
  options,
  placeholder,
  triggerClassName,
  value,
}: {
  readonly className?: string;
  readonly id: string;
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly {
    readonly label: ReactNode;
    readonly value: string;
  }[];
  readonly placeholder?: string;
  readonly triggerClassName?: string;
  readonly value: string;
}) {
  return (
    <LabelledField className={className} htmlFor={id} label={label}>
      <Select
        items={options}
        onValueChange={(next) => onChange(String(next ?? ""))}
        value={value}
      >
        <SelectTrigger className={triggerClassName} id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </LabelledField>
  );
}
