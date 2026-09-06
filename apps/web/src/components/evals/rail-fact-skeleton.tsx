import { Skeleton } from "@anpord/ui/components/skeleton";
import { cn } from "@anpord/ui/lib/utils";

export interface RailFactShape {
  readonly share?: boolean;
  readonly width: string;
}

/* Sizes must match RailFact's "stated" layout, or the section shifts when values arrive. */
export function RailFactSkeleton({
  className,
  facts,
}: {
  readonly className?: string;
  readonly facts: readonly RailFactShape[];
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {facts.map((fact, index) => (
        <div
          className="flex h-6 items-center gap-2"
          key={`fact-${index satisfies number}`}
        >
          <Skeleton className="size-3.5 shrink-0 rounded-sm" />
          <Skeleton className={cn("h-3", fact.width)} />

          {fact.share === true ? (
            <Skeleton className="h-0.5 w-6 shrink-0 rounded-full" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
