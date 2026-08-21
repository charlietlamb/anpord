import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { RailSection } from "@/components/rail/rail-section";
import { SETTINGS_NAV } from "@/components/settings/settings-nav";

/** No heading: the breadcrumb above names the page and the highlighted item
 * below names the section, so a third statement of "Settings" would only push
 * the nav down the column. */
export function SettingsSidebar() {
  return (
    <aside className="flex min-w-0 flex-col gap-6">
      {SETTINGS_NAV.map((section) => (
        <RailSection key={section.label} title={section.label}>
          <nav className="flex flex-col">
            {section.items.map((item) => (
              <Link
                activeOptions={{ exact: item.to === "/settings" }}
                activeProps={{ className: "bg-muted text-foreground" }}
                className={cn(
                  BLEED_ROW,
                  "flex items-center gap-2 rounded-md py-1.5 text-label text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                )}
                key={item.to}
                to={item.to}
              >
                <item.icon className="size-4 shrink-0" weight="fill" />
                {item.label}
              </Link>
            ))}
          </nav>
        </RailSection>
      ))}
    </aside>
  );
}
