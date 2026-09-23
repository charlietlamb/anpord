import { createFileRoute, Outlet } from "@tanstack/react-router";
import { evalQueries } from "@/lib/evals/eval-queries";

export const Route = createFileRoute("/_authed/evals/cases/$caseId")({
  ssr: false,
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(evalQueries.case(params.caseId));
  },
  component: Outlet,
  staticData: {
    crumb: (params, queryClient) =>
      queryClient.getQueryData(evalQueries.case(params.caseId).queryKey)?.name,
    title: "Case",
  },
});
