import { cn } from "@anpord/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { Sparkline } from "@/components/home/sparkline";
import { VerdictSquares } from "@/components/home/verdict-squares";
import type { HomeSuiteRow as Row } from "@/lib/evals/home-view";

export function HomeSuiteRow({ row }: { readonly row: Row }) {
  const { tally } = row;

  return (
    <tr className="border-border border-t align-middle">
      <th className="py-2.5 pr-3 text-left font-medium" scope="row">
        <Link
          className="block truncate transition-colors duration-150 hover:text-muted-foreground"
          params={{ suiteId: row.suite.id }}
          to="/evals/suites/$suiteId"
        >
          {row.suite.name}
        </Link>
      </th>
      <td className="py-2.5 pr-3">
        <VerdictSquares cells={row.cells} small />
      </td>
      <td
        className={cn(
          "py-2.5 tabular-nums",
          tally.passRate === null ? "text-muted-foreground/70" : "font-semibold"
        )}
      >
        {tally.passRate === null ? "Not scored" : `${tally.passRate}%`}
      </td>
      <td
        className={cn(
          "py-2.5 tabular-nums",
          tally.failing === 0 ? "text-muted-foreground/70" : "text-destructive"
        )}
      >
        {tally.failing === 0 ? "0" : `${tally.failing} failing`}
      </td>
      <td className="py-2.5">
        <Sparkline
          className={
            tally.failing > 1 ? "text-destructive" : "text-muted-foreground"
          }
          height={18}
          rates={row.trend}
          width={60}
        />
      </td>
    </tr>
  );
}
