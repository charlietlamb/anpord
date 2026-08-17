import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { RailCard } from "@/components/rail/rail-card";
import { SETTINGS_NAV } from "@/components/settings/settings-nav";

/** Carries a heading of its own so both columns begin at their first card
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

      <div className="flex flex-col gap-3">
        {SETTINGS_NAV.map((section) => (
          <RailCard
            className="px-0 py-0"
            key={section.label}
            title={section.label}
          >
            <nav className={cn("flex flex-col", ROW_DIVIDERS)}>
              {section.items.map((item) => (
                <Link
                  activeOptions={{ exact: item.to === "/settings" }}
                  activeProps={{ className: "bg-muted text-foreground" }}
                  className="flex items-center gap-2 px-3.5 py-2.5 text-[0.8125rem] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  key={item.to}
                  to={item.to}
                >
                  <item.icon className="size-4 shrink-0" weight="fill" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </RailCard>
        ))}
      </div>
    </aside>
  );
}
