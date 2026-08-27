import type {
  CredentialAuthMethod,
  CredentialConnection,
} from "@anpord/schema/domain/credentials";
import { FormDialog } from "@anpord/ui/components/dialog/form-dialog";
import { ShortcutButton } from "@anpord/ui/components/ui/shortcut-button";
import { useState } from "react";
import { toast } from "sonner";
import { CredentialFields } from "@/components/settings/credential-fields";
import { credentialsClient } from "@/lib/credentials-client";

export function RotateConnectionDialog({
  connection,
  method,
  onClose,
  onRotated,
}: {
  readonly connection: CredentialConnection | null;
  readonly method: CredentialAuthMethod | null;
  readonly onClose: () => void;
  readonly onRotated: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const close = () => {
    setValues({});
    onClose();
  };

  const submit = async () => {
    if (!(connection && method)) {
      return;
    }
    setPending(true);
    try {
      await credentialsClient.rotate(connection.id, { values });
      onRotated();
      close();
      toast.success("Credential rotated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rotation failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <FormDialog
      description="Replace the stored secret without changing saved eval bindings."
      onClose={close}
      onSubmit={submit}
      open={connection !== null}
      title={
        connection === null ? "Rotate credential" : `Rotate ${connection.name}`
      }
    >
      {method ? (
        <CredentialFields
          method={method}
          onChange={(field, value) =>
            setValues((current) => ({ ...current, [field]: value }))
          }
          values={values}
        />
      ) : null}
      <ShortcutButton
        className="h-10 w-full text-sm"
        disabled={
          pending ||
          method === null ||
          method.fields.some(
            (field) => field.required && !values[field.name]?.trim()
          )
        }
        metaShortcut="enter"
        onClick={submit}
        size="lg"
        type="button"
      >
        {pending ? "Rotating…" : "Rotate credential"}
      </ShortcutButton>
    </FormDialog>
  );
}
