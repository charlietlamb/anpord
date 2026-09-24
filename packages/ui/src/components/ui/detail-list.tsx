import type { ReactNode } from "react";
import { Skeleton } from "@anpord/ui/components/skeleton";
import {
  SURFACE_BODY,
  SURFACE_FOOTER,
  SURFACE_FRAME,
  SURFACE_HEAD,
} from "@anpord/ui/lib/surface";
import { cn } from "@anpord/ui/lib/utils";

export function DetailList({
  actions,
  bare = false,
  children,
  footer,
  label,
  title,
}: {
  readonly actions?: ReactNode;
  readonly bare?: boolean;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly label: string;
  readonly title?: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={cn("@container", !bare && SURFACE_FRAME)}
    >
      {title === undefined && actions === undefined ? null : (
        <div className={cn(SURFACE_HEAD, "flex items-center gap-2 px-3")}>
          <span className="flex min-w-0 items-center gap-2 truncate">
            {title}
          </span>
          {actions === undefined ? null : (
            <span className="ml-auto flex items-center gap-1">{actions}</span>
          )}
        </div>
      )}
      <dl className={cn("divide-y divide-border", !bare && SURFACE_BODY)}>
        {children}
      </dl>
      {footer === undefined ? null : (
        <div className={SURFACE_FOOTER}>{footer}</div>
      )}
    </section>
  );
}

export function DetailRow({
  action,
  children,
  description,
  label,
}: {
  readonly action?: ReactNode;
  readonly children?: ReactNode;
  readonly description?: string;
  readonly label: string;
}) {
  return (
    <div className="grid items-center gap-x-8 gap-y-1.5 px-4 py-3 @xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
      <dt className="flex flex-col gap-0.5">
        <span className="text-label text-muted-foreground">{label}</span>
        {description === undefined ? null : (
          <span className="text-muted-foreground/70 text-xs">
            {description}
          </span>
        )}
      </dt>
      <dd className="flex min-w-0 items-center gap-3 text-label text-foreground">
        {children === undefined ? null : (
          <div className="min-w-0 flex-1">{children}</div>
        )}
        {action === undefined ? null : (
          <div className="ml-auto shrink-0">{action}</div>
        )}
      </dd>
    </div>
  );
}

export function DetailListSkeleton({
  label,
  rows = 2,
}: {
  readonly label: string;
  readonly rows?: number;
}) {
  return (
    <DetailList label={label}>
      {Array.from({ length: rows }, (_, row) => (
        <div
          className="grid gap-x-8 gap-y-1.5 px-4 py-3 @xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]"
          key={`row-${row satisfies number}`}
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </DetailList>
  );
}
