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
        "relative z-10 flex flex-col rounded-[18px] bg-card shadow-[inset_0_0_0_1px_oklch(0_0_0/4%),0_2px_6px_oklch(0_0_0/5%),0_12px_32px_-16px_oklch(0_0_0/14%)] transition-shadow focus-within:shadow-[inset_0_0_0_1px_var(--ring),0_2px_6px_oklch(0_0_0/5%),0_12px_32px_-16px_oklch(0_0_0/14%)] dark:shadow-[inset_0_0_0_1px_oklch(1_0_0/8%),0_2px_6px_oklch(0_0_0/25%),0_12px_32px_-16px_oklch(0_0_0/50%)]",
        className
      )}
      {...props}
    />
  );
}

/** Toolbar inside the surface, so the whole thing reads as one object. */
export function ComposerToolbar({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 pb-2 text-muted-foreground",
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
