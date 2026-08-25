import { cn } from "@anpord/ui/lib/utils";
import { CaretRightIcon, type Icon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";

/**
 * One part of the setup on its own ground.
 *
 * A framed surface with a header bar, the way a code block carries its
 * filename: the label names what is inside, the count says how much, and the
 * controls that act on it sit on the same line. The frame is alpha-white on
 * both sides so it reads as a lift off the page rather than a second colour.
 *
 * Closing keeps the header as a pill, so a collapsed part is still a thing on
 * the page and not a line of text pretending to be one.
 */
export function SetupSurface({
  children,
  controls,
  defaultOpen = true,
  Icon: Glyph,
  meta,
  title,
}: {
  readonly children: ReactNode;
  readonly controls?: ReactNode;
  readonly defaultOpen?: boolean;
  readonly Icon: Icon;
  readonly meta?: string;
  readonly title: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="group/surface overflow-hidden rounded-lg border border-border-faint bg-muted/30">
      <div
        className={cn(
          "flex h-9 items-center gap-2 pr-1.5 pl-3",
          open && "border-border-faint border-b"
        )}
      >
        <button
          aria-expanded={open}
          className="flex h-full min-w-0 flex-1 items-center gap-1.5 text-left text-muted-foreground text-xs transition-colors duration-150 ease-out hover:text-foreground"
          onClick={() => setOpen((was) => !was)}
          type="button"
        >
          <CaretRightIcon
            aria-hidden="true"
            className={cn(
              "shrink-0 transition-transform ease-out",
              open ? "rotate-90 duration-200" : "duration-75"
            )}
            size={10}
            weight="bold"
          />
          <Glyph aria-hidden="true" className="shrink-0" size={13} />
          <span className="font-medium text-foreground">{title}</span>
          {meta === undefined ? null : (
            <span className="text-muted-foreground/70 tabular-nums">
              {meta}
            </span>
          )}
        </button>

        {open && controls ? (
          <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 ease-out focus-within:opacity-100 group-hover/surface:opacity-100">
            {controls}
          </span>
        ) : null}
      </div>

      {open ? <div className="px-3.5 py-3">{children}</div> : null}
    </section>
  );
}
