import { cn } from "@anpord/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { SETTINGS_NAV } from "@/components/settings/settings-nav";

export function SettingsSidebar() {
  return (
    <nav className="flex w-52 shrink-0 flex-col gap-4 border-border border-r p-3">
      {SETTINGS_NAV.map((section) => (
        <div className="flex flex-col gap-0.5" key={section.label}>
          <span className="px-3 py-1.5 font-medium text-muted-foreground text-xs">
            {section.label}
          </span>
          {section.items.map((item) => (
            <Link
              activeOptions={{ exact: item.to === "/settings" }}
              activeProps={{
                className: "border-border bg-muted text-foreground",
              }}
              className={cn(
                "flex items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
              )}
              key={item.to}
              to={item.to}
            >
              <item.icon className="size-4" weight="fill" />
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
