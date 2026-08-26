import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { BLEED_ROW_FULL } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { GearIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { SETTINGS_NAV } from "@/components/settings/settings-nav";

/** No heading: the breadcrumb above names the page and the highlighted item
 * below names the section, so a third statement of "Settings" would only push
 * the nav down the column. */
export function SettingsSidebar() {
  return (
    <aside className="flex min-w-0 flex-col gap-6">
      {/* Filled, unlike the outlined marks in the nav below: this names the
          place rather than offering somewhere to go. */}
      <h1 className="flex items-center gap-2 font-medium text-muted-foreground text-xs">
        <GearIcon className="size-3.5 shrink-0" weight="fill" />
        Settings
      </h1>

      {SETTINGS_NAV.map((section) => (
        <RailSection key={section.label} title={section.label}>
          <nav className="flex flex-col">
            {section.items.map((item) => (
              <Link
                activeOptions={{ exact: item.to === "/settings" }}
                activeProps={{
                  className: "bg-muted font-medium text-foreground",
                }}
                className={cn(
                  BLEED_ROW_FULL,
                  "flex h-8 items-center gap-2 rounded-md text-muted-foreground text-xs transition-colors hover:bg-muted/50 hover:text-foreground"
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
