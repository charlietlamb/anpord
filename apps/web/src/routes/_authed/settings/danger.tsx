import { createFileRoute } from "@tanstack/react-router";
import { DangerZoneSettings } from "@/components/settings/danger-zone-settings";

export const Route = createFileRoute("/_authed/settings/danger")({
  component: DangerZoneSettings,
  staticData: { title: "Danger zone" },
});
