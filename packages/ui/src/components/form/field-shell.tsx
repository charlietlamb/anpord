import { FieldInfo } from "@anpord/ui/components/form/field-info";
import { LabelledField } from "@anpord/ui/components/form/labelled-field";
import type { AnyFieldApi } from "@tanstack/react-form";
import type { ReactNode } from "react";

export function FieldShell({
  children,
  className,
  description,
  field,
  hideLabel,
  label,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly description?: string;
  readonly field: AnyFieldApi;
  readonly hideLabel?: boolean;
  readonly label: string;
}) {
  return (
    <LabelledField
      className={className}
      description={description}
      hideLabel={hideLabel}
      htmlFor={field.name}
      label={label}
    >
      {children}
      <FieldInfo field={field} />
    </LabelledField>
  );
}
