import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { NAV_ITEM } from "@anpord/ui/lib/nav-item";
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
                className={NAV_ITEM}
                key={item.to}
                to={item.to}
              >
                <item.icon />
                {item.label}
              </Link>
            ))}
          </nav>
        </RailSection>
      ))}
    </aside>
  );
}
