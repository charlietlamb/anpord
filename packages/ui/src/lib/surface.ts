const SURFACE_BORDER = "border border-border bg-card dark:bg-muted";

export const SURFACE_FILL = `${SURFACE_BORDER} shadow-sm`;

export const SURFACE_CONTROL = "bg-control shadow-(--shadow-control)";

export const SURFACE_CONTROL_HOVER =
  "hover:bg-[color-mix(in_oklch,var(--control),var(--foreground)_5%)] aria-expanded:bg-[color-mix(in_oklch,var(--control),var(--foreground)_5%)]";

export const SURFACE_RING = "ring-2 ring-muted dark:ring-card";

export const SURFACE_FRAME = "rounded-xl bg-muted p-1 dark:bg-card";

export const SURFACE_HEAD = "h-8 text-muted-foreground text-xs";

export const SURFACE_FOOTER =
  "flex min-h-9 items-center gap-3 px-4 pt-2 pb-1 text-label text-muted-foreground";

export const SURFACE_BODY = `overflow-hidden rounded-lg ${SURFACE_FILL}`;
