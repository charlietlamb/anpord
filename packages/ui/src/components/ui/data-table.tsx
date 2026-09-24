import { mergeProps } from "@base-ui/react/merge-props";
import { CaretRightIcon } from "@phosphor-icons/react";
import { useRender } from "@base-ui/react/use-render";
import type { CSSProperties, ComponentProps, ReactNode } from "react";
import { Skeleton } from "@anpord/ui/components/skeleton";
import {
  SURFACE_BODY,
  SURFACE_FRAME,
  SURFACE_HEAD,
} from "@anpord/ui/lib/surface";
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
      className={cn(SURFACE_FRAME, className)}
      style={{ "--data-table-columns": columns } as CSSProperties}
    >
      {children}
    </section>
  );
}

export function DataTableHead({
  headings,
}: {
  readonly headings: readonly ReactNode[];
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(COLUMNS, SURFACE_HEAD)}
    >
      {headings.map((heading, column) => (
        <span className="min-w-0 truncate" key={`column-${column satisfies number}`}>
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
<ul className={cn(SURFACE_BODY, className)} {...props} />
  );
}

export function DataTableRow({
  className,
  render,
  selected = false,
  ...props
}: useRender.ComponentProps<"div"> & { readonly selected?: boolean }) {
  const row = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          COLUMNS,
          "h-10 text-label",
          render !== undefined &&
            "w-full text-left transition-colors hover:bg-alpha-4 focus-visible:bg-alpha-4 focus-visible:outline-none",
          selected && "bg-alpha-4",
          className
        ),
      },
      props
    ),
    render,
  });

  return <li className="border-border border-b last:border-b-0">{row}</li>;
}

export function DataTableChevron() {
  return (
    <CaretRightIcon
      aria-hidden="true"
      className="size-3.5 text-muted-foreground"
    />
  );
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
