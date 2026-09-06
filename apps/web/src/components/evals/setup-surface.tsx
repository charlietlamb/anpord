import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export function SetupSurface({
  children,
  contentClassName,
  controls,
  Icon: Glyph,
  meta,
  title,
}: {
  readonly children: ReactNode;
  readonly contentClassName?: string;
  readonly controls?: ReactNode;
  readonly Icon: Icon;
  readonly meta?: string;
  readonly title: string;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex h-7 items-center gap-2">
        <h3>
          <PageHeading icon={Glyph} title={title} />
        </h3>
        {meta === undefined ? null : (
          <span className="text-muted-foreground text-xs tabular-nums">
            {meta}
          </span>
        )}
        {controls ? (
          <span className="ml-auto flex items-center gap-1">{controls}</span>
        ) : null}
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
