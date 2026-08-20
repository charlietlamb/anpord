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
          className="flex max-w-md flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.AppField name="name">
            {(field) => <field.TextField label="Name" />}
          </form.AppField>
          <form.AppField name="slug">
            {(field) => <field.TextField label="Slug" />}
          </form.AppField>
          <div className="flex justify-start">
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
