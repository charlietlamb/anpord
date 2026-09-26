import type { ReactNode } from "react";

export function StepProperties({
  rows,
}: {
  readonly rows: readonly (readonly [string, ReactNode])[];
}) {
  return (
    <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 text-[13px]">
      {rows.map(([label, value]) => (
        <div className="contents" key={label}>
          <dt className="flex min-h-8 items-center text-muted-foreground">
            {label}
          </dt>
          <dd className="flex min-h-8 min-w-0 items-center text-foreground tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
