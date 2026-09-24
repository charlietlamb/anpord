import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SettingsFrame } from "@/components/settings/settings-frame";

export const Route = createFileRoute("/_authed/settings")({
  component: SettingsLayout,
  staticData: { title: "Settings" },
});

function SettingsLayout() {
  return (
    <SettingsFrame>
      <Outlet />
    </SettingsFrame>
  );
}
