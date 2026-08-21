import { Button } from "@anpord/ui/components/button";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { authClient } from "@/lib/auth-client";
import { useDialog } from "@/lib/dialog/dialogs";
import { useOrganizations } from "@/lib/use-organizations";

export function DangerZoneSettings() {
  const { activeOrganization } = useOrganizations();
  const { open } = useDialog();
  const router = useRouter();

  async function deleteOrganization() {
    if (!activeOrganization) {
      return;
    }
    const { error } = await authClient.organization.delete({
      organizationId: activeOrganization.id,
    });
    if (error) {
      toast.error("Couldn't delete organization", {
        description: error.message ?? "Please try again.",
      });
      return;
    }
    toast.success("Organization deleted");
    router.invalidate();
  }

  return (
    <SettingsPanel description="Irreversible actions for this organization.">
      {/* The one border left in the authed app. It is not drawing a card: it
          says this row is different from the settings above it, which is what
          a border is for. */}
      <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/25 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <p className="font-medium text-sm">Delete organization</p>
          <p className="text-muted-foreground text-sm">
            Permanently delete {activeOrganization?.name ?? "this organization"}{" "}
            and all its data.
          </p>
        </div>
        <Button
          disabled={!activeOrganization}
          onClick={() =>
            open("confirm", {
              title: "Delete organization",
              description: `This permanently deletes ${activeOrganization?.name} and all its credentials, sessions, and audit logs. This cannot be undone.`,
              confirmLabel: "Delete organization",
              destructive: true,
              onConfirm: deleteOrganization,
            })
          }
          variant="destructive"
        >
          Delete
        </Button>
      </div>
    </SettingsPanel>
  );
}
