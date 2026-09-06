import { createFileRoute, Outlet } from "@tanstack/react-router";
import { evalQueries } from "@/lib/evals/eval-queries";

export const Route = createFileRoute("/_authed/evals/$runId/cells/$cellKey")({
  component: CellLayout,
  staticData: {
    /* The case name, not the key, which is a content hash. Undefined while the
       run loads, so the crumb fills in rather than flashing a placeholder. */
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
