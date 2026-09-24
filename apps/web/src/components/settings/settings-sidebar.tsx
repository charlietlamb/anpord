import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { BLEED_ROW_FULL } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { GearIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { SETTINGS_NAV } from "@/components/settings/settings-nav";

export function SettingsSidebar() {
  return (
    <aside className="flex min-w-0 flex-col gap-6">
      <p className="flex min-h-9 items-center gap-2 font-medium text-muted-foreground text-xs">
        <GearIcon className="size-3.5 shrink-0" weight="fill" />
        Settings
      </p>

      {SETTINGS_NAV.map((section) => (
        <RailSection key={section.label} title={section.label}>
          <nav className="flex flex-col">
            {section.items.map((item) => (
              <Link
                activeOptions={{ exact: item.to === "/settings" }}
                activeProps={{
                  className: "bg-alpha-8 font-medium text-foreground",
                }}
                className={cn(
                  BLEED_ROW_FULL,
                  "flex h-8 items-center gap-2 rounded-md text-muted-foreground text-xs transition-colors hover:bg-alpha-4 hover:text-foreground"
                )}
                key={item.to}
                to={item.to}
              >
                <item.icon className="size-3.5 shrink-0" />
                {item.label}
              </Link>
            ))}
          </nav>
        </RailSection>
      ))}
    </aside>
  );
}
