import { Button } from "@anpord/ui/components/button";
import { cn } from "@anpord/ui/lib/utils";
import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface RowBodyProps {
  readonly children: ReactNode;
  readonly className: string;
  readonly onSelect?: () => void;
  readonly params?: LinkProps["params"];
  readonly role?: "option";
  readonly selected?: boolean;
  readonly to?: LinkProps["to"];
}

/** A row that goes somewhere is a link, one that does something is a button,
 * and one that does neither is neither — a row whose only control is the menu
 * beside it should not answer to the keyboard as though the whole line acts. */
export function RowBody({
  children,
  className,
  onSelect,
  params,
  role,
  selected,
  to,
}: RowBodyProps) {
  if (to) {
    return (
      <Link
        className={cn(
          className,
          "transition-colors hover:bg-muted/50 hover:text-foreground"
        )}
        params={params}
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
        role={role}
        variant="bare"
      >
        {children}
      </Button>
    );
  }

  return <div className={className}>{children}</div>;
}
