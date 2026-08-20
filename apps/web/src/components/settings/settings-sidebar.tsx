import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { RailSection } from "@/components/rail/rail-section";
import { SETTINGS_NAV } from "@/components/settings/settings-nav";

/** Carries a heading of its own so both columns begin at their first section
 * rather than one starting a title higher than the other. */
export function SettingsSidebar() {
  return (
    <aside className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-2xl tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm">
          Your organization and its keys.
        </p>
      </div>

      <div className="flex flex-col gap-6">
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
      </div>
    </aside>
  );
}
