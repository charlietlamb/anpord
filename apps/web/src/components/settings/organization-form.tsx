import { DetailList, DetailRow } from "@anpord/ui/components/ui/detail-list";
import { useOrganizationSettingsForm } from "@/lib/use-organization-settings-form";

export function OrganizationForm({
  name,
  slug,
}: {
  readonly name: string;
  readonly slug: string;
}) {
  const form = useOrganizationSettingsForm({ name, slug });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <DetailList
        footer={
          <div className="ml-auto">
            <form.AppForm>
              <form.SubmitButton
                fullWidth={false}
                label="Save changes"
                loadingLabel="Saving…"
              />
            </form.AppForm>
          </div>
        }
        label="Organization"
      >
        <DetailRow description="Shown to everyone in it." label="Name">
          <form.AppField name="name">
            {(field) => <field.TextField hideLabel label="Name" />}
          </form.AppField>
        </DetailRow>
        <DetailRow description="Used in links and the CLI." label="Slug">
          <form.AppField name="slug">
            {(field) => <field.TextField hideLabel label="Slug" />}
          </form.AppField>
        </DetailRow>
      </DetailList>
    </form>
  );
}
