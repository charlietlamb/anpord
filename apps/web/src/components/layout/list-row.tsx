import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { RowBody } from "@/components/layout/row-body";

interface ListRowProps {
  /** Revealed on approach: a control that is always lit competes with the row
   * it acts on, and there is only ever one row being pointed at. */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  /** The marker column — a dot, a face, an icon. Holds its width whether or
   * not it is filled, so the text beside it lines up down the list. */
  readonly leading?: ReactNode;
  /** Right-aligned and quiet: a timestamp or a count is read after the thing
   * it describes, not with it. */
  readonly meta?: ReactNode;
  readonly onSelect?: () => void;
  readonly params?: LinkProps["params"];
  readonly selected?: boolean;
  readonly to?: LinkProps["to"];
}

/** One line, whatever it names. Shared so a list of prompts and a list of
 * versions are the same object at different scales rather than two designs
 * that happen to sit in one app. */
const ROW = "flex h-7 w-full items-center gap-2 rounded-md text-label";

export function ListRow({
  actions,
  children,
  leading,
  meta,
  onSelect,
  params,
  selected,
  to,
}: ListRowProps) {
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1 truncate text-left">{children}</span>
      {meta ? (
        <span className="shrink-0 text-xs tabular-nums opacity-60">{meta}</span>
      ) : null}
    </>
  );

  const tone = selected
    ? "bg-muted font-medium text-foreground"
    : "font-normal text-muted-foreground";

  return (
    <div className="group/row flex items-center">
      <RowBody
        className={cn(ROW, BLEED_ROW, tone)}
        onSelect={onSelect}
        params={params}
        to={to}
      >
        {body}
      </RowBody>

      {actions ? <div className="-mr-1 shrink-0">{actions}</div> : null}
    </div>
  );
}
