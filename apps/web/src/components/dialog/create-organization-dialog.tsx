import { FormDialog } from "@anpord/ui/components/dialog/form-dialog";
import { slugify } from "@anpord/ui/lib/slugify";
import { useRef } from "react";
import { useDialog, useDialogOpen } from "@/lib/dialog/dialogs";
import { useCreateOrganizationForm } from "@/lib/use-create-organization-form";

export function CreateOrganizationDialog() {
  const { close } = useDialog();
  const open = useDialogOpen("createOrganization");
  const slugEdited = useRef(false);
  const form = useCreateOrganizationForm(close);

  return (
    <FormDialog
      description="Organizations keep credentials, sessions, and audit logs separate."
      onClose={close}
      onSubmit={form.handleSubmit}
      open={open}
      title="Create organization"
    >
      <form.AppField name="name">
        {(field) => (
          <field.TextField
            autoComplete="organization"
            label="Name"
            onValueChange={(value) => {
              if (!slugEdited.current) {
                form.setFieldValue("slug", slugify(value));
              }
            }}
            placeholder="Acme Inc."
          />
        )}
      </form.AppField>
      <form.AppField name="slug">
        {(field) => (
          <field.TextField
            label="Slug"
            onValueChange={() => {
              slugEdited.current = true;
            }}
            placeholder="acme"
          />
        )}
      </form.AppField>
      <form.AppForm>
        <form.SubmitButton
          label="Create organization"
          loadingLabel="Creating…"
        />
      </form.AppForm>
    </FormDialog>
  );
}
