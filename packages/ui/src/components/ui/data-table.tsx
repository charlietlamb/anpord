import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { CSSProperties, ComponentProps, ReactNode } from "react";
import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";

const COLUMNS =
  "grid grid-cols-[var(--data-table-columns)] items-center gap-4 px-4";

export function DataTable({
  children,
  className,
  columns,
  label,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly columns: string;
  readonly label: string;
}) {
  return (
    <section
      aria-label={label}
      className={cn("rounded-xl bg-muted p-1 dark:bg-card", className)}
      style={{ "--data-table-columns": columns } as CSSProperties}
    >
      {children}
    </section>
  );
}

export function DataTableHead({
  headings,
}: {
  readonly headings: readonly string[];
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(COLUMNS, "h-10 text-label text-muted-foreground")}
    >
      {headings.map((heading) => (
        <span className="truncate" key={heading}>
          {heading}
        </span>
      ))}
    </div>
  );
}

export function DataTableBody({
  className,
  ...props
}: ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-sm dark:bg-muted",
        className
      )}
      {...props}
    />
  );
}

export function DataTableRow({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  const row = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          COLUMNS,
          "h-11 text-label",
          render !== undefined &&
            "transition-colors hover:bg-alpha-4 focus-visible:bg-alpha-4 focus-visible:outline-none",
          className
        ),
      },
      props
    ),
    render,
  });

  return <li className="border-border border-b last:border-b-0">{row}</li>;
}

export function DataTableFooter({
  actions,
  children,
}: {
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-h-9 items-center gap-3 px-4 pt-2 pb-1">
      <p className="text-label text-muted-foreground">{children}</p>
      {actions === undefined ? null : <div className="ml-auto">{actions}</div>}
    </div>
  );
}

export function DataTableSkeleton({
  columns,
  headings,
  label,
  rows = 6,
}: {
  readonly columns: string;
  readonly headings: readonly string[];
  readonly label: string;
  readonly rows?: number;
}) {
  return (
    <DataTable columns={columns} label={label}>
      <DataTableHead headings={headings} />
      <DataTableBody aria-busy="true">
        {Array.from({ length: rows }, (_, row) => (
          <DataTableRow key={`row-${row satisfies number}`}>
            {headings.map((heading) => (
              <Skeleton className="h-3 w-3/5" key={heading} />
            ))}
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
