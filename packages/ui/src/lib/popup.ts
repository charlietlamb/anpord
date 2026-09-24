export const POPUP =
  "rounded-lg bg-popover text-popover-foreground shadow-(--shadow-popover) outline-none";

export const POPUP_MOTION =
  "origin-(--transform-origin) duration-100 data-open:fade-in-0 data-open:zoom-in-95 data-open:animate-in data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:animate-out";

export const MENU_ITEM =
  "relative flex min-h-7 w-full cursor-default select-none items-center gap-2 rounded-md px-2 py-1 text-muted-foreground text-xs/relaxed outline-hidden focus:bg-alpha-8 focus:text-foreground focus:**:text-foreground data-highlighted:bg-alpha-8 data-highlighted:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-3.5 [&_svg]:pointer-events-none [&_svg]:shrink-0";

export const MENU_SEPARATOR = "-mx-1 my-1 h-px bg-border";

export const MENU_LABEL =
  "px-2 pt-2 pb-1 font-medium text-2xs text-muted-foreground";
