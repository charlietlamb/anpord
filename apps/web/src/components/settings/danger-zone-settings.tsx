import { Button } from "@anpord/ui/components/button";
import { DetailList, DetailRow } from "@anpord/ui/components/ui/detail-list";
import { PageHeader } from "@/components/layout/page-header";
import { useDialog } from "@/lib/dialog/dialogs";
import { useDeleteOrganization } from "@/lib/use-delete-organization";
import { useOrganizations } from "@/lib/use-organizations";

export function DangerZoneSettings() {
  const { activeOrganization } = useOrganizations();
  const { open } = useDialog();
  const remove = useDeleteOrganization();
  const name = activeOrganization?.name ?? "this organization";

  const confirm = () =>
    open("confirm", {
      confirmLabel: "Delete organization",
      description: `This permanently deletes ${name} and all its credentials, sessions, and audit logs. This cannot be undone.`,
      destructive: true,
      onConfirm: () => {
        if (activeOrganization) {
          remove.mutate(activeOrganization.id);
        }
      },
      title: "Delete organization",
    });

  return (
    <>
      <PageHeader
        description="Irreversible actions for this organization."
        title="Danger zone"
      />
      <DetailList label="Danger zone">
        <DetailRow
          action={
            <Button
              disabled={!activeOrganization || remove.isPending}
              onClick={confirm}
              size="sm"
              variant="destructive"
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </Button>
          }
          description={`Permanently delete ${name} and all its data.`}
          label="Delete organization"
        />
      </DetailList>
    </>
  );
}
