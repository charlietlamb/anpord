import type * as React from "react";
import { cn } from "../lib/utils";

export function ComposerContext({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 pb-2 text-muted-foreground text-sm",
        className
      )}
      {...props}
    />
  );
}

/* Deliberately frameless: the caret already says where you are typing. */
export function ComposerSurface({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("relative flex flex-col", className)} {...props} />;
}

export function ComposerToolbar({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-1 flex items-center gap-1 border-border-faint border-t px-1 pt-2 pb-1 text-muted-foreground",
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
