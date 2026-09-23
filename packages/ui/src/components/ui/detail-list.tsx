import type { ReactNode } from "react";
import { SURFACE_BODY, SURFACE_FRAME } from "@anpord/ui/lib/surface";
import { cn } from "@anpord/ui/lib/utils";

export function DetailList({
  bare = false,
  children,
  label,
}: {
  readonly bare?: boolean;
  readonly children: ReactNode;
  readonly label: string;
}) {
  return (
    <section
      aria-label={label}
      className={cn("@container", !bare && SURFACE_FRAME)}
    >
      <dl className={cn("divide-y divide-border", !bare && SURFACE_BODY)}>
        {children}
      </dl>
    </section>
  );
}

export function DetailRow({
  children,
  description,
  label,
}: {
  readonly children: ReactNode;
  readonly description?: string;
  readonly label: string;
}) {
  return (
    <div className="grid gap-x-8 gap-y-1.5 px-4 py-3 @xl:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
      <dt className="flex flex-col gap-0.5">
        <span className="text-label text-muted-foreground">{label}</span>
        {description === undefined ? null : (
          <span className="text-muted-foreground/70 text-xs">
            {description}
          </span>
        )}
      </dt>
      <dd className="min-w-0 text-label text-foreground">{children}</dd>
    </div>
  );
}
