import type {
  CredentialAuthMethod,
  CredentialConnection,
} from "@anpord/schema/domain/credentials";
import { FormDialog } from "@anpord/ui/components/dialog/form-dialog";
import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import { CredentialFields } from "@/components/settings/credential-fields";
import { credentialsClient } from "@/lib/credentials-client";
import { incompleteCredential } from "@/lib/settings/credential-values";
import { useCredentialMutation } from "@/lib/settings/use-credential-mutation";

export function RotateConnectionDialog({
  connection,
  method,
  onClose,
}: {
  readonly connection: CredentialConnection | null;
  readonly method: CredentialAuthMethod | null;
  readonly onClose: () => void;
}) {
  const rotate = useCredentialMutation({
    mutationFn: ({
      id,
      values,
    }: {
      readonly id: string;
      readonly values: Readonly<Record<string, string>>;
    }) => credentialsClient.rotate(id, { values }),
    success: "Credential rotated",
  });

  const form = useAppForm({
    defaultValues: { values: {} as Readonly<Record<string, string>> },
    onSubmit: ({ value }) => {
      if (
        connection === null ||
        method === null ||
        incompleteCredential(method, value.values)
      ) {
        return;
      }
      rotate.mutate(
        { id: connection.id, values: value.values },
        { onSuccess: close }
      );
    },
  });

  const close = () => {
    form.reset();
    onClose();
  };

  return (
    <FormDialog
      description="Replace the stored secret without changing saved eval bindings."
      onClose={close}
      onSubmit={form.handleSubmit}
      open={connection !== null}
      title={
        connection === null ? "Rotate credential" : `Rotate ${connection.name}`
      }
    >
      {method === null ? null : (
        <form.AppField name="values">
          {(field) => (
            <CredentialFields
              method={method}
              onChange={field.handleChange}
              values={field.state.value}
            />
          )}
        </form.AppField>
      )}
      <form.Subscribe selector={(state) => state.values.values}>
        {(values) => (
          <form.AppForm>
            <form.SubmitButton
              disabled={
                rotate.isPending ||
                method === null ||
                incompleteCredential(method, values)
              }
              label={rotate.isPending ? "Rotating…" : "Rotate credential"}
            />
          </form.AppForm>
        )}
      </form.Subscribe>
    </FormDialog>
  );
}
