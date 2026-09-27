import { useShortAge } from "@anpord/ui/hooks/use-relative-time";
import { Link } from "@tanstack/react-router";
import { DateTime } from "effect";
import { TrialSquares } from "@/components/home/trial-squares";
import type { HomeRun } from "@/lib/evals/home-view";

const summaryOf = (run: HomeRun) => {
  const count = (outcome: string) =>
    run.trials.filter((trial) => trial === outcome).length;
  return `${count("passed")} passed, ${count("failed")} failed, ${count("void")} not scored`;
};

export function HomeRunRow({ run }: { readonly run: HomeRun }) {
  const age = useShortAge(DateTime.toDate(run.at));

  return (
    <li className="border-border border-t first:border-t-0">
      <Link
        aria-label={`${run.name}, ${summaryOf(run)}`}
        className="flex min-h-[52px] items-center gap-4 px-4 py-2 transition-colors duration-150 hover:bg-alpha-4"
        params={{ batchId: run.id }}
        to="/evals/$batchId"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-medium text-[13px]">{run.name}</span>
          <span className="truncate text-muted-foreground/70 text-xs">
            {run.scope} · {run.source}
          </span>
        </span>
        <TrialSquares trials={run.trials} />
        <span className="w-[68px] shrink-0 text-right text-muted-foreground/70 text-xs">
          {age === null ? null : `${age} ago`}
        </span>
      </Link>
    </li>
  );
}
