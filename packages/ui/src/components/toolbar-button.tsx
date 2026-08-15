import { CaretDownIcon } from "@phosphor-icons/react";
import type * as React from "react";
import { cn } from "../lib/utils";

interface ToolbarButtonProps extends React.ComponentProps<"button"> {
  /** Renders a caret so the control reads as opening a menu. */
  readonly menu?: boolean;
}

/**
 * Toolbar controls sit at reduced contrast so the text being written stays the
 * loudest thing in the composer; they resolve to full contrast on interaction.
 */
export function ToolbarButton({
  children,
  className,
  menu,
  ...props
}: ToolbarButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-2 font-medium text-[0.8125rem] text-muted-foreground outline-none transition-colors",
        "hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      type="button"
      {...props}
    >
      {children}
      {menu ? <CaretDownIcon className="opacity-60" weight="bold" /> : null}
    </button>
  );
}
