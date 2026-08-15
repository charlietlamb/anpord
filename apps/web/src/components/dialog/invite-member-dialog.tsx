import { FormDialog } from "@anpord/ui/components/dialog/form-dialog";
import { useDialog, useDialogOpen } from "@/lib/dialog/dialogs";
import {
  MEMBER_ROLES,
  useInviteMemberForm,
} from "@/lib/use-invite-member-form";

const ROLE_OPTIONS = MEMBER_ROLES.map((role) => ({
  label: role.charAt(0).toUpperCase() + role.slice(1),
  value: role,
}));

export function InviteMemberDialog() {
  const { close } = useDialog();
  const open = useDialogOpen("inviteMember");
  const form = useInviteMemberForm(close);

  return (
    <FormDialog
      description="Send an invitation to join this organization."
      onClose={close}
      onSubmit={form.handleSubmit}
      open={open}
      title="Invite member"
    >
      <form.AppField name="email">
        {(field) => (
          <field.TextField
            autoComplete="email"
            label="Email"
            placeholder="teammate@company.com"
            type="email"
          />
        )}
      </form.AppField>
      <form.AppField name="role">
        {(field) => <field.SelectField label="Role" options={ROLE_OPTIONS} />}
      </form.AppField>
      <form.AppForm>
        <form.SubmitButton label="Send invitation" loadingLabel="Sending…" />
      </form.AppForm>
    </FormDialog>
  );
}
