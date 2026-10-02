import { cn } from "@sphynx/ui/lib/utils";
import { HomePanel } from "@/components/home/home-panel";
import { VerdictSquares } from "@/components/home/verdict-squares";
import type { HomeView } from "@/lib/evals/home-view";

export function HomeVariants({
  more,
  variants,
}: {
  readonly more: number;
  readonly variants: HomeView["variants"];
}) {
  return (
    <HomePanel className="py-1" title="By variant">
      <ul className="flex flex-col">
        {variants.map((row) => (
          <li
            className="flex flex-col gap-1.5 border-border border-t py-2.5 first:border-t-0"
            key={row.label}
          >
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate" title={row.label}>
                {row.label}
              </span>
              <span
                className={cn(
                  "shrink-0 tabular-nums",
                  row.tally.passRate === null
                    ? "text-muted-foreground/70 text-xs"
                    : "font-semibold"
                )}
              >
                {row.tally.passRate === null
                  ? "Not scored"
                  : `${row.tally.passRate}%`}
              </span>
            </div>
            <VerdictSquares cells={row.cells} small />
          </li>
        ))}
      </ul>
      {more === 0 ? null : (
        <p className="border-border border-t py-2.5 text-muted-foreground/70 text-xs">
          {more === 1 ? "1 more variant" : `${more} more variants`}
        </p>
      )}
    </HomePanel>
  );
}
