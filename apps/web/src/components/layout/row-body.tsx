import { Button } from "@anpord/ui/components/button";
import { cn } from "@anpord/ui/lib/utils";
import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode, Ref } from "react";

interface RowBodyProps {
  readonly children: ReactNode;
  readonly className: string;
  readonly onMouseEnter?: () => void;
  readonly onSelect?: () => void;
  readonly params?: LinkProps["params"];
  readonly ref?: Ref<HTMLElement>;
  readonly role?: "option";
  readonly selected?: boolean;
  /* Owned by the list: only the focused row is tabbable, so a long list does not swallow the tab order. */
  readonly tabIndex?: number;
  readonly to?: LinkProps["to"];
}

export function RowBody({
  children,
  className,
  onMouseEnter,
  onSelect,
  params,
  ref,
  role,
  selected,
  tabIndex,
  to,
}: RowBodyProps) {
  if (to) {
    return (
      <Link
        className={cn(
          className,
          "transition-colors group-hover/row:text-foreground"
        )}
        onMouseEnter={onMouseEnter}
        params={params}
        ref={ref as Ref<HTMLAnchorElement>}
        tabIndex={tabIndex}
        to={to}
      >
        {children}
      </Link>
    );
  }

  if (onSelect) {
    return (
      <Button
        aria-selected={role === "option" ? selected : undefined}
        className={className}
        onClick={onSelect}
        onMouseEnter={onMouseEnter}
        ref={ref as Ref<HTMLButtonElement>}
        role={role}
        tabIndex={tabIndex}
        variant="bare"
      >
        {children}
      </Button>
    );
  }

  return <div className={className}>{children}</div>;
}
