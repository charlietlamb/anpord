import type {
  EnvironmentVariable,
  UpdateVariable,
} from "@sphynx/schema/domain/environment";
import { BaseDialog } from "@sphynx/ui/components/dialog/base-dialog";
import { LabelledSelect } from "@sphynx/ui/components/form/labelled-select";
import { useAppForm } from "@sphynx/ui/hooks/use-app-form";
import { toast } from "sonner";
import { useDialog, useDialogOpen } from "@/lib/dialog/dialogs";
import { environmentClient } from "@/lib/environment-client";
import { SCOPE_OPTIONS, scopeOf } from "@/lib/settings/scopes";
import { useEnvironmentMutation } from "@/lib/settings/use-environment-mutation";

interface EditVariableDialogProps {
  readonly variable: EnvironmentVariable;
}

const changesOf = (
  variable: EnvironmentVariable,
  value: { readonly scope: string; readonly value: string }
): UpdateVariable => {
  const scope = scopeOf(value.scope);

  return {
    ...(value.value === "" ? {} : { value: value.value }),
    ...(scope === variable.scope ? {} : { scope }),
  };
};

export function EditVariableDialog({ variable }: EditVariableDialogProps) {
  const { close } = useDialog();
  const open = useDialogOpen("editVariable");
  const update = useEnvironmentMutation({
    failure: `Couldn't save ${variable.name}`,
    mutationFn: environmentClient.updateVariable,
  });

  const form = useAppForm({
    defaultValues: { scope: variable.scope as string, value: "" },
    onSubmit: async ({ value }) => {
      const changes = changesOf(variable, value);

      if (Object.keys(changes).length === 0) {
        close();
        return;
      }

      await update.mutateAsync({ id: variable.id, ...changes }).then(
        () => {
          toast.success(`Saved ${variable.name}`);
          close();
        },
        () => undefined
      );
    },
  });

  return (
    <BaseDialog
      className="[&_[data-slot=dialog-title]]:font-mono"
      description="Paste a new value to replace it. Runs pick it up on their next start."
      onClose={close}
      open={open}
      title={variable.name}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          form.handleSubmit();
        }}
      >
        <form.AppField name="value">
          {(field) => (
            <field.TextField
              autoComplete="off"
              label="New value"
              placeholder={`Leave empty to keep ${variable.preview}`}
              type={variable.secret ? "password" : "text"}
            />
          )}
        </form.AppField>
        <form.AppField name="scope">
          {(field) => (
            <LabelledSelect
              id="variable-scope"
              label="Available to"
              onChange={field.handleChange}
              options={SCOPE_OPTIONS}
              value={field.state.value}
            />
          )}
        </form.AppField>
        <form.AppForm>
          <form.SubmitButton label="Save" loadingLabel="Saving…" />
        </form.AppForm>
      </form>
    </BaseDialog>
  );
}
