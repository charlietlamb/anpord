import type * as React from "react";
import { cn } from "../lib/utils";

/**
 * A row of context above the writing surface. It names what is being edited
 * and sits on the page at reduced contrast, so the prompt below stays the
 * loudest thing in the column.
 */
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

/**
 * The input surface. It draws nothing at all: the prompt is the page's subject,
 * and neither a frame nor a focus ring around the thing you came to read earns
 * its place. The caret already says where you are typing.
 */
export function ComposerSurface({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("relative flex flex-col", className)} {...props} />;
}

/**
 * Toolbar beneath the writing surface. A hairline separates the controls from
 * the text without drawing a container around either.
 */
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
