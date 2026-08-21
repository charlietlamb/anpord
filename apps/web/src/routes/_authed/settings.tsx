import { PAGE_FRAME, PAGE_WIDTHS } from "@anpord/ui/lib/page-frame";
import { cn } from "@anpord/ui/lib/utils";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export const Route = createFileRoute("/_authed/settings")({
  component: SettingsLayout,
  staticData: { title: "Settings" },
});

function SettingsLayout() {
  return (
    <div className={PAGE_FRAME}>
      <div
        className={cn(
          PAGE_WIDTHS.wide,
          "grid grid-cols-1 items-start gap-8 pt-5 pb-24 lg:grid-cols-[13rem_minmax(0,1fr)] xl:gap-10"
        )}
      >
        <SettingsSidebar />
        <Outlet />
      </div>
    </div>
  );
}
