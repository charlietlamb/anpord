import { HomePanel } from "@/components/home/home-panel";
import { HomeRunRow } from "@/components/home/home-run-row";
import type { HomeRun } from "@/lib/evals/home-view";

export function HomeRecentRuns({
  runs,
}: {
  readonly runs: readonly HomeRun[];
}) {
  return (
    <HomePanel className="gap-0 p-0" title="Recent runs">
      {runs.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-muted-foreground">
          No runs yet.
        </p>
      ) : (
        <ul className="flex flex-col">
          {runs.map((run) => (
            <HomeRunRow key={run.id} run={run} />
          ))}
        </ul>
      )}
    </HomePanel>
  );
}
