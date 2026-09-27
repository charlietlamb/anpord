import { cn } from "@anpord/ui/lib/utils";
import { HomePanel } from "@/components/home/home-panel";
import { rateTint } from "@/components/home/rate-tint";
import type { HomeView } from "@/lib/evals/home-view";

const shortLabel = (label: string) => label.slice(label.indexOf("/") + 1);

export function HomeVariantGrid({ grid }: { readonly grid: HomeView["grid"] }) {
  return (
    <HomePanel className="overflow-x-auto" title="By variant">
      <table className="w-full border-separate border-spacing-1 text-[13px]">
        <thead>
          <tr>
            <th className="w-[120px]">
              <span className="sr-only">Suite</span>
            </th>
            {grid.variants.map((label) => (
              <th
                className="truncate text-left font-normal text-muted-foreground/70 text-xs"
                key={label}
                scope="col"
                title={label}
              >
                <span>{shortLabel(label)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row) => (
            <tr key={row.suite.id}>
              <th
                className="truncate text-left font-normal text-muted-foreground"
                scope="row"
              >
                <span>{row.suite.name}</span>
              </th>
              {row.cells.map((rate, index) => (
                <td
                  className={cn(
                    "skeleton:skeleton-block h-[26px] rounded-md px-2.5 font-medium tabular-nums ring-1 skeleton:ring-0 ring-inset",
                    rate === null
                      ? "text-muted-foreground/50 ring-border"
                      : rateTint(rate)
                  )}
                  key={grid.variants[index]}
                >
                  {rate === null ? "None" : `${rate}%`}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </HomePanel>
  );
}
