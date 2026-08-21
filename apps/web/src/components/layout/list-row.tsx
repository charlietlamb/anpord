import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode, Ref } from "react";
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
  readonly onMouseEnter?: () => void;
  readonly onSelect?: () => void;
  readonly params?: LinkProps["params"];
  readonly ref?: Ref<HTMLElement>;
  /** Set where the row is one option among several, so the list it sits in can
   * announce itself as a set rather than as a run of unrelated controls. */
  readonly role?: "option";
  readonly selected?: boolean;
  /** Only the row the keyboard is on is reachable by Tab. */
  readonly tabIndex?: number;
  readonly to?: LinkProps["to"];
}

/** One line, whatever it names. Shared so a list of prompts and a list of
 * versions are the same object at different scales rather than two designs
 * that happen to sit in one app. */
const ROW = "flex h-10 items-center gap-2.5 rounded-md px-2 text-label";

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
        <span className="flex shrink-0 items-center gap-3 text-muted-foreground text-xs tabular-nums">
          {meta}
        </span>
      ) : null}
    </>
  );

  /* The surface is the row wrapper's now, so what is left here is only how
     the text reads inside it. */
  const tone = selected
    ? "font-medium text-foreground"
    : "font-normal text-muted-foreground";

  return (
    <div
      /* The highlight belongs to the row rather than to the body inside it:
         the menu beside the body cannot live within a link, and a surface
         drawn on the body alone stops just short of it. */
      className={cn(
        BLEED_ROW,
        "group/row flex items-center rounded-md transition-colors",
        selected ? "bg-muted" : "hover:bg-muted/50"
      )}
      /* Stripped from the accessibility tree so the option inside it stays a
         direct child of the listbox: a generic wrapper between the two breaks
         the set, and a screen reader stops announcing "3 of 12". */
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
