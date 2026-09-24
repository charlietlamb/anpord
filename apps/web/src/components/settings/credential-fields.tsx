import type { CredentialAuthMethod } from "@anpord/schema/domain/credentials";
import { LabelledField } from "@anpord/ui/components/form/labelled-field";
import { Input } from "@anpord/ui/components/input";
import { cn } from "@anpord/ui/lib/utils";
import { EnvFields } from "@/components/settings/env-fields";

export function CredentialFields({
  method,
  onChange,
  values,
}: {
  readonly method: CredentialAuthMethod;
  readonly onChange: (values: Readonly<Record<string, string>>) => void;
  readonly values: Readonly<Record<string, string>>;
}) {
  if (method.kind === "env") {
    return <EnvFields onChange={onChange} />;
  }

  return (
    <div
      className={cn("grid gap-4", method.fields.length > 1 && "sm:grid-cols-2")}
    >
      {method.fields.map((field) => (
        <LabelledField
          htmlFor={`credential-${field.name}`}
          key={field.name}
          label={field.label}
        >
          <Input
            id={`credential-${field.name}`}
            onChange={(event) =>
              onChange({ ...values, [field.name]: event.target.value })
            }
            placeholder={field.hint}
            required={field.required}
            size="lg"
            type={field.secret ? "password" : "text"}
            value={values[field.name] ?? ""}
          />
        </LabelledField>
      ))}
    </div>
  );
}
