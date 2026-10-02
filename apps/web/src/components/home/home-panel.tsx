import {
  SURFACE_BODY,
  SURFACE_FRAME,
  SURFACE_HEAD,
} from "@sphynx/ui/lib/surface";
import { cn } from "@sphynx/ui/lib/utils";
import type { ReactNode } from "react";

export function HomePanel({
  aside,
  children,
  className,
  title,
  titled = true,
}: {
  readonly aside?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly title: string;
  readonly titled?: boolean;
}) {
  return (
    <section
      aria-label={title}
      className={cn(SURFACE_FRAME, "flex min-w-0 flex-col")}
    >
      {titled ? (
        <header
          className={cn(SURFACE_HEAD, "flex items-center justify-between px-3")}
        >
          <h2 className="truncate font-medium">{title}</h2>
          {aside === undefined ? null : (
            <span className="shrink-0 text-muted-foreground/70 tabular-nums">
              {aside}
            </span>
          )}
        </header>
      ) : null}
      <div
        className={cn(
          SURFACE_BODY,
          "flex min-w-0 flex-1 flex-col gap-3 p-4",
          className
        )}
      >
        {children}
      </div>
    </section>
  );
}
