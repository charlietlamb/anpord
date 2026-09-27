import { cn } from "@anpord/ui/lib/utils";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

const COLUMNS =
  "grid grid-cols-[var(--step-list-columns)] items-center gap-4 px-4";

export function StepList({
  children,
  className,
  columns,
  label,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly columns?: string;
  readonly label: string;
}) {
  return (
    <section
      aria-label={label}
      className={cn("-mx-4 flex flex-col", className)}
      style={
        columns === undefined
          ? undefined
          : ({ "--step-list-columns": columns } as CSSProperties)
      }
    >
      {children}
    </section>
  );
}

export function StepListHead({
  headings,
}: {
  readonly headings: readonly string[];
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        COLUMNS,
        "skeleton-static h-8 text-muted-foreground text-xs"
      )}
    >
      {headings.map((heading) => (
        <span className="min-w-0 truncate" key={heading}>
          {heading}
        </span>
      ))}
    </div>
  );
}

export function StepListBody({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "flex flex-col border-border border-y [&>*+*]:border-border [&>*+*]:border-t",
        className
      )}
      {...props}
    />
  );
}

export function StepListRow({
  className,
  selected,
  ...props
}: ComponentProps<"button"> & { readonly selected: boolean }) {
  return (
    <li>
      <button
        aria-pressed={selected}
        className={cn(
          COLUMNS,
          "h-10 w-full text-left text-label outline-none transition-colors hover:bg-alpha-4 focus-visible:bg-alpha-4",
          selected && "bg-alpha-4",
          className
        )}
        type="button"
        {...props}
      />
    </li>
  );
}

export function StepListFooter({ children }: { readonly children: ReactNode }) {
  return (
    <p className="flex min-h-9 items-center px-4 pt-2 text-label text-muted-foreground">
      {children}
    </p>
  );
}
