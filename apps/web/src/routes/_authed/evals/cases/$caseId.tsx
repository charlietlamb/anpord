import type { EvalCaseDetail } from "@sphynx/schema/domain/eval-read-models";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { evalKeys } from "@/lib/evals/eval-keys";
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
        evalKeys.case(params.caseId),
        (entry: EvalCaseDetail) => entry.name
      ),
    title: "Case",
  },
});
