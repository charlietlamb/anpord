import { createFileRoute, Outlet } from "@tanstack/react-router";
import { evalQueries } from "@/lib/evals/eval-queries";

/** A layout, so a trial renders in the cell's place rather than under it. */
export const Route = createFileRoute("/_authed/evals/$runId/cells/$cellKey")({
  component: CellLayout,
  staticData: {
    /* The case name rather than the key: the key is a content hash, and a
       breadcrumb reading "cell" names the kind of thing rather than which
       one. Undefined while the run loads, so the crumb fills in rather than
       flashing a placeholder that then changes. */
    crumb: (params, queryClient) =>
      queryClient
        .getQueryData(evalQueries.detail(params.runId).queryKey)
        ?.cells.find((cell) => cell.cellKey === params.cellKey)?.caseName,
    title: "Cell",
  },
});

function CellLayout() {
  return <Outlet />;
}
