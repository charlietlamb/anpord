import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode, Ref } from "react";
import { RowBody } from "@/components/layout/row-body";

interface ListRowProps {
  readonly actions?: ReactNode;
  readonly children: ReactNode;

  readonly leading?: ReactNode;

  readonly meta?: ReactNode;
  readonly onMouseEnter?: () => void;
  readonly onSelect?: () => void;
  readonly params?: LinkProps["params"];
  readonly ref?: Ref<HTMLElement>;

  readonly role?: "option";
  readonly selected?: boolean;

  readonly tabIndex?: number;
  readonly to?: LinkProps["to"];
}

/** The geometry of a row, shared so a skeleton stands exactly where the row it
 * stands in for will: three of them had drifted to their own heights, and a
 * list settled by a pixel or two as it loaded. */
export const ROW_SHAPE = "flex h-10 items-center gap-2.5 px-2";

/**
 * The name a row is recognised by.
 *
 * A row is muted until it is selected, so the one thing a reader scans for
 * has to lift itself out of that. Five lists had each decided how: two wrote
 * `font-medium text-foreground`, one added a size the row already sets, and
 * one left the name at the same weight as the metadata beside it.
 *
 * Set in the display face the headings use, a step smaller than the row's own
 * size and tracked in. A name is the one thing on a row that is read rather
 * than scanned, and the face that carries the page title carries it here at a
 * size that stops it shouting down the numbers beside it.
 */
export function RowTitle({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <span
      className={cn(
        "truncate font-heading font-medium text-foreground text-label tracking-[-0.01em]",
        className
      )}
    >
      {children}
    </span>
  );
}

const ROW = cn(ROW_SHAPE, "rounded-md text-label");

export function ListRow({
  actions,
  children,
  leading,
  meta,
  onMouseEnter,
  onSelect,
  params,
  ref,
  role,
  selected,
  tabIndex,
  to,
}: ListRowProps) {
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1 truncate text-left">{children}</span>
      {meta ? (
        <span className="flex shrink-0 items-center gap-4 text-muted-foreground text-xs tabular-nums">
          {meta}
        </span>
      ) : null}
    </>
  );

  const tone = selected
    ? "font-medium text-foreground"
    : "font-normal text-muted-foreground";

  return (
    <div
      className={cn(
        BLEED_ROW,
        "group/row flex items-center rounded-md transition-colors",
        selected ? "bg-muted" : "hover:bg-muted/50"
      )}
      role={role ? "presentation" : undefined}
    >
      <RowBody
        className={cn(ROW, "min-w-0 flex-1", tone)}
        onMouseEnter={onMouseEnter}
        onSelect={onSelect}
        params={params}
        ref={ref}
        role={role}
        selected={selected}
        tabIndex={tabIndex}
        to={to}
      >
        {body}
      </RowBody>

      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
