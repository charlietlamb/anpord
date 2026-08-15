import type * as React from "react";
import { cn } from "../lib/utils";

/**
 * A context strip that sits behind the surface, revealing only its top edge.
 * Negative bottom margin plus a lower z-index produce the tucked-under look.
 */
export function ComposerContext({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative z-0 mx-1.5 -mb-5 flex items-center gap-0.5 rounded-t-xl border border-border-surface border-b-0 bg-muted px-2 pt-1.5 pb-6 text-muted-foreground text-sm",
        className
      )}
      {...props}
    />
  );
}

/**
 * The input surface. A real border draws the perimeter and an inset highlight
 * catches light along the top edge, the same two-edge anatomy the buttons use,
 * so the shape stays defined instead of dissolving into its own shadow.
 */
export function ComposerSurface({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative z-10 flex flex-col rounded-[18px] border border-border-surface bg-card shadow-elevated transition-colors focus-within:border-ring",
        className
      )}
      {...props}
    />
  );
}

/**
 * Toolbar inside the surface, so the whole thing reads as one object. A hairline
 * separates the controls from the text without breaking that.
 */
export function ComposerToolbar({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-1 flex items-center gap-1 border-border/60 border-t px-2 pt-2 pb-2 text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function ComposerToolbarGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center gap-1", className)} {...props} />
  );
}
