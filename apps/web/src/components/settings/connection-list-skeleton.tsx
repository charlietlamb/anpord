import { Skeleton } from "@anpord/ui/components/skeleton";
import { SectionLabel } from "@anpord/ui/components/ui/section-label";
import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { ROW_SHAPE } from "@/components/layout/list-row";

/* The two groups the page always lays out, with the names a connection list
   holds under each. Grouped rather than a flat run of rows because the page
   settles into sections, and a flat list would reflow into them. */
const GROUPS: readonly {
  readonly names: readonly string[];
  readonly title: string;
}[] = [
  { names: ["w-24", "w-28"], title: "Harnesses" },
  { names: ["w-20"], title: "Sandboxes" },
];

function ConnectionRowSkeleton({ name }: { readonly name: string }) {
  return (
    <div className={cn(BLEED_ROW, ROW_SHAPE)}>
      {/* The integration's own glyph, the name, then what it is and how it
          authenticates, which the row sets muted beside the name. */}
      <Skeleton className="size-3.5 shrink-0 rounded-sm" />

      <span className="flex min-w-0 items-center gap-2.5">
        <Skeleton className={cn("h-3", name)} />
        <Skeleton className="h-3 w-28" />
      </span>

      <span className="ml-auto flex shrink-0 items-center gap-4">
        <Skeleton className="h-3 w-20" />
        {/* The row's menu trigger, which is a control and not a value. */}
        <Skeleton className="size-4 shrink-0 rounded-sm" />
      </span>
    </div>
  );
}

/** The connections page before its credentials are known. */
export function ConnectionListSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {GROUPS.map((group) => (
        <section className="flex flex-col gap-1" key={group.title}>
          {/* The titles are the page's own and are known before the fetch, so
              they are set for real rather than placeheld. */}
          <SectionLabel>{group.title}</SectionLabel>

          <div className="flex flex-col">
            {group.names.map((name, index) => (
              <ConnectionRowSkeleton
                key={`row-${index satisfies number}`}
                name={name}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
