import { useShortAge } from "@anpord/ui/hooks/use-relative-time";
import { Link } from "@tanstack/react-router";
import { DateTime } from "effect";
import type { HomeRun } from "@/lib/evals/home-view";

export function HomeRunRow({ run }: { readonly run: HomeRun }) {
  const age = useShortAge(DateTime.toDate(run.at));

  return (
    <li className="border-border border-t first:border-t-0">
      <Link
        className="flex h-9 items-center gap-3 text-[13px] transition-colors duration-150 hover:bg-alpha-4"
        params={{ batchId: run.id }}
        to="/evals/$batchId"
      >
        <span className="w-[104px] shrink-0 truncate">{run.source}</span>
        <span
          aria-hidden="true"
          className="skeleton:skeleton-block flex h-1.5 min-w-10 flex-1 gap-0.5 overflow-hidden rounded-full"
        >
          <span className="bg-success" style={{ flexGrow: run.passed }} />
          {run.failed === 0 ? null : (
            <span className="bg-destructive" style={{ flexGrow: run.failed }} />
          )}
          {run.voided === 0 ? null : (
            <span
              className="bg-muted-foreground/40"
              style={{ flexGrow: run.voided }}
            />
          )}
        </span>
        <span className="w-12 shrink-0 text-right text-muted-foreground tabular-nums">
          {run.passed}/{run.total}
        </span>
        <span className="w-[70px] shrink-0 text-right text-muted-foreground/70 text-xs">
          {age === null ? null : `${age} ago`}
        </span>
      </Link>
    </li>
  );
}
