import { Button } from "@anpord/ui/components/button";
import { Surface } from "@anpord/ui/components/ui/surface";
import { PageHeader } from "@/components/layout/page-header";
import { useDialog } from "@/lib/dialog/dialogs";
import { useDeleteOrganization } from "@/lib/use-delete-organization";
import { useOrganizations } from "@/lib/use-organizations";

export function DangerZoneSettings() {
  const { activeOrganization } = useOrganizations();
  const { open } = useDialog();
  const remove = useDeleteOrganization();
  const name = activeOrganization?.name ?? "this organization";

  return (
    <>
      <PageHeader
        description="Irreversible actions for this organization."
        title="Danger zone"
      />
      <Surface className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="font-medium text-label">Delete organization</p>
          <p className="text-label text-muted-foreground">
            Permanently delete {name} and all its data.
          </p>
        </div>
        <Button
          disabled={!activeOrganization || remove.isPending}
          onClick={() =>
            open("confirm", {
              title: "Delete organization",
              description: `This permanently deletes ${name} and all its credentials, sessions, and audit logs. This cannot be undone.`,
              confirmLabel: "Delete organization",
              destructive: true,
              onConfirm: () => {
                if (activeOrganization) {
                  remove.mutate(activeOrganization.id);
                }
              },
            })
          }
          size="sm"
          variant="destructive"
        >
          {remove.isPending ? "Deleting…" : "Delete"}
        </Button>
      </Surface>
    </>
  );
}
