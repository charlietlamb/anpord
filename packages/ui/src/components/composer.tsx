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
        "relative z-0 mx-1.5 -mb-5 flex items-center gap-0.5 rounded-t-xl bg-muted/70 px-2 pt-1.5 pb-6 text-muted-foreground text-sm ring-1 ring-border/50",
        className
      )}
      {...props}
    />
  );
}

/**
 * The input surface. A hairline ring rather than a border keeps the edge from
 * reading as a control, and the shadow separates it from the page without
 * looking raised.
 */
export function ComposerSurface({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative z-10 flex flex-col rounded-[18px] bg-card shadow-elevated ring-1 ring-black/[0.07] transition-shadow focus-within:ring-ring dark:ring-white/[0.16]",
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
