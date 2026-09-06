import { cn } from "@anpord/ui/lib/utils";
import { CaretRightIcon, type Icon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";

export function SetupSurface({
  children,
  collapsible = true,
  contentClassName,
  controls,
  defaultOpen = true,
  Icon: Glyph,
  meta,
  title,
}: {
  readonly children: ReactNode;
  readonly collapsible?: boolean;
  readonly contentClassName?: string;
  readonly controls?: ReactNode;
  readonly defaultOpen?: boolean;
  readonly Icon: Icon;
  readonly meta?: string;
  readonly title: string;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const open = !collapsible || expanded;
  const Heading = collapsible ? "button" : "h3";

  return (
    <section className="group/surface overflow-hidden rounded-lg border border-border-faint bg-muted/30">
      <div
        className={cn(
          "flex h-9 items-center gap-2 pr-1.5 pl-3",
          open && "border-border-faint border-b"
        )}
      >
        <Heading
          aria-expanded={collapsible ? open : undefined}
          className="flex h-full min-w-0 flex-1 items-center gap-1.5 text-left text-muted-foreground text-xs transition-colors duration-150 ease-out hover:text-foreground"
          onClick={collapsible ? () => setExpanded((was) => !was) : undefined}
          type={collapsible ? "button" : undefined}
        >
          {collapsible ? (
            <CaretRightIcon
              aria-hidden="true"
              className={cn(
                "shrink-0 transition-transform ease-out",
                open ? "rotate-90 duration-200" : "duration-75"
              )}
              size={10}
              weight="bold"
            />
          ) : null}
          <Glyph aria-hidden="true" className="shrink-0" size={13} />
          <span className="font-medium text-foreground">{title}</span>
          {meta === undefined ? null : (
            <span className="text-muted-foreground/70 tabular-nums">
              {meta}
            </span>
          )}
        </Heading>

        {open && controls ? (
          <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 ease-out focus-within:opacity-100 group-hover/surface:opacity-100">
            {controls}
          </span>
        ) : null}
      </div>

      {open ? (
        <div className={cn("px-3.5 py-3", contentClassName)}>{children}</div>
      ) : null}
    </section>
  );
}
