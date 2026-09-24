import { PAGE_FRAME, PAGE_WIDTHS } from "@anpord/ui/lib/page-frame";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export function SettingsFrame({ children }: { readonly children: ReactNode }) {
  return (
    <div className={PAGE_FRAME}>
      <div
        className={cn(
          PAGE_WIDTHS.wide,
          "grid grid-cols-1 items-start gap-8 pt-4 pb-8 lg:grid-cols-[13rem_minmax(0,1fr)] xl:gap-10"
        )}
      >
        <SettingsSidebar />
        <div className="flex min-w-0 flex-col gap-5">{children}</div>
      </div>
    </div>
  );
}
