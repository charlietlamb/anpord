import { SettingsPanel } from "@/components/settings/settings-panel";
import { useOrganizationSettingsForm } from "@/lib/use-organization-settings-form";
import { useOrganizations } from "@/lib/use-organizations";

export function GeneralSettings() {
  const { activeOrganization } = useOrganizations();
  const form = useOrganizationSettingsForm({
    name: activeOrganization?.name ?? "",
    slug: activeOrganization?.slug ?? "",
  });

  return (
    <SettingsPanel
      description="Update your organization's name and slug."
      title="General"
    >
      {activeOrganization ? (
        <form
          className="max-w-2xl overflow-hidden rounded-xl border border-border"
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="grid gap-5 p-6">
            <form.AppField name="name">
              {(field) => <field.TextField label="Name" />}
            </form.AppField>
            <form.AppField name="slug">
              {(field) => <field.TextField label="Slug" />}
            </form.AppField>
          </div>
          <div className="flex justify-end border-border border-t bg-muted px-6 py-4">
            <form.AppForm>
              <form.SubmitButton
                fullWidth={false}
                label="Save changes"
                loadingLabel="Saving…"
              />
            </form.AppForm>
          </div>
        </form>
      ) : (
        <p className="text-muted-foreground text-sm">
          Select or create an organization to manage settings.
        </p>
      )}
    </SettingsPanel>
  );
}
