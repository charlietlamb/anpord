import { createFileRoute, Outlet } from "@tanstack/react-router";
import { evalQueries } from "@/lib/evals/eval-queries";

const RUN_PREFIX = /^run_/;

/* Enough of the id to tell two runs apart without pasting 26 characters of
   entropy into the bar. The whole id is on the run screen. */
const shortId = (id: string) => id.replace(RUN_PREFIX, "").slice(0, 6);

/** A layout rather than a page: the run screen is the index beneath it, so a
 * cell and a trial can render in its place rather than under it. */
export const Route = createFileRoute("/_authed/evals/$runId")({
  component: RunLayout,
  staticData: {
    /* Named as a run, not as what it ran. A one-case run and its cell would
       otherwise carry the same label, and the trail dedupes neighbours, so
       the run silently vanished from its own breadcrumb. */
    crumb: (params, queryClient) => {
      const run = queryClient.getQueryData(
        evalQueries.detail(params.runId).queryKey
      );

      if (run === undefined) {
        return `Run ${shortId(params.runId)}`;
      }

      const grid =
        run.cases.length * run.tasks.length > 1
          ? ` · ${run.cases.length}×${run.tasks.length}`
          : "";

      return `Run ${shortId(run.id)}${grid}`;
    },
    title: "Run",
  },
});

function RunLayout() {
  return <Outlet />;
}
