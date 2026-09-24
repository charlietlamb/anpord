import { BLEED_ROW_FULL } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";

export const NAV_ITEM = cn(
  BLEED_ROW_FULL,
  "flex h-8 items-center gap-2 rounded-md text-muted-foreground text-xs transition-colors hover:bg-alpha-4 hover:text-foreground data-[status=active]:bg-alpha-8 data-[status=active]:font-medium data-[status=active]:text-foreground [&_svg]:size-3.5 [&_svg]:shrink-0"
);
