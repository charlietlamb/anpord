import { createFileRoute, Outlet } from "@tanstack/react-router";
import { evalQueries } from "@/lib/evals/eval-queries";
import { crumbFrom } from "@/lib/use-breadcrumbs";

export const Route = createFileRoute("/_authed/evals/cases/$caseId")({
  ssr: false,
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(evalQueries.case(params.caseId));
  },
  component: Outlet,
  staticData: {
    crumb: (params) =>
      crumbFrom(
        evalQueries.case(params.caseId).queryKey,
        (entry) => entry.name
      ),
    title: "Case",
  },
});
