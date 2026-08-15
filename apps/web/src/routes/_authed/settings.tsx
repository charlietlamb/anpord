import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export const Route = createFileRoute("/_authed/settings")({
  component: SettingsLayout,
  staticData: { title: "Settings" },
});

function SettingsLayout() {
  return (
    <div className="flex flex-1 overflow-hidden">
      <SettingsSidebar />
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
