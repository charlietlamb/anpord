import type { CredentialAuthMethod } from "@anpord/schema/domain/credentials";

/* A device login asks for nothing here, so it is never incomplete. */
export const incompleteCredential = (
  method: CredentialAuthMethod,
  values: Readonly<Record<string, string>>
) => {
  if (method.kind === "env") {
    return Object.keys(values).length === 0;
  }

  return (
    method.kind === "secret" &&
    method.fields.some((field) => field.required && !values[field.name]?.trim())
  );
};
