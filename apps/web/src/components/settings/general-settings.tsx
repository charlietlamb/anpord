import { EmptyState } from "@anpord/ui/components/ui/empty-state";
import { BuildingsIcon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/layout/page-header";
import { OrganizationForm } from "@/components/settings/organization-form";
import { useOrganizations } from "@/lib/use-organizations";

export function GeneralSettings() {
  const { activeOrganization } = useOrganizations();
  return (
    <>
      <PageHeader
        description="Update your organization's name and slug."
        title="General"
      />
      {activeOrganization ? (
        <OrganizationForm
          name={activeOrganization.name}
          slug={activeOrganization.slug}
        />
      ) : (
        <EmptyState
          description="Select or create an organization to manage its settings."
          icon={<BuildingsIcon />}
          title="No organization selected"
        />
      )}
    </>
  );
}
