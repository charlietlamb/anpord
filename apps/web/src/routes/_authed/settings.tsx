import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export const Route = createFileRoute("/_authed/settings")({
  component: SettingsLayout,
  staticData: { title: "Settings" },
});

function SettingsLayout() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-5 pb-6">
      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 px-5 lg:grid-cols-[13rem_minmax(0,1fr)] xl:gap-5 xl:px-6">
        <SettingsSidebar />
        <Outlet />
      </div>
    </div>
  );
}
