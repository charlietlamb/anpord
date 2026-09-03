import type { CredentialAuthMethod } from "@anpord/schema/domain/credentials";
import { Input } from "@anpord/ui/components/input";
import { Label } from "@anpord/ui/components/ui/label";
import { cn } from "@anpord/ui/lib/utils";
import { EnvFields } from "@/components/settings/env-fields";

/**
 * The secrets one authentication method asks for.
 *
 * Labelled above rather than by placeholder: a placeholder is the only name a
 * field has until it is filled, and then it is gone, so a half-filled form
 * stops saying what its own boxes are. The placeholder shows the shape of the
 * value instead, which the label cannot -- a team id and a project id are
 * both "an id" until you see one. Shared with the rotate dialog, which asks
 * for exactly the same values.
 *
 * Hands up the whole map rather than one field at a time, because an env
 * method has no fields of its own and replaces the map on every keystroke.
 */
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
        <div className="grid gap-1.5" key={field.name}>
          <Label htmlFor={`credential-${field.name}`}>{field.label}</Label>
          <Input
            id={`credential-${field.name}`}
            onChange={(event) =>
              onChange({ ...values, [field.name]: event.target.value })
            }
            placeholder={field.hint}
            required={field.required}
            type={field.secret ? "password" : "text"}
            value={values[field.name] ?? ""}
          />
        </div>
      ))}
    </div>
  );
}
