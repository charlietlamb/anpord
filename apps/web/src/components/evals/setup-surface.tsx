import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import type { ReactNode } from "react";

export function SetupSurface({
  children,
  contentClassName,
  controls,
  meta,
  title,
  /* A tab above already names the section; a heading would say it twice. */
  titled = true,
}: {
  readonly children: ReactNode;
  readonly contentClassName?: string;
  readonly controls?: ReactNode;
  readonly meta?: string;
  readonly title: string;
  readonly titled?: boolean;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex h-7 items-center gap-2 empty:hidden">
        {titled ? (
          <>
            <h3>
              <PageHeading size="section" title={title} />
            </h3>

            {/* The count belongs to the heading, so it goes where it goes. */}
            {meta === undefined ? null : (
              <span className="text-muted-foreground text-xs tabular-nums">
                {meta}
              </span>
            )}
          </>
        ) : null}
        {controls ? (
          <span className="ml-auto flex items-center gap-1">{controls}</span>
        ) : null}
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
