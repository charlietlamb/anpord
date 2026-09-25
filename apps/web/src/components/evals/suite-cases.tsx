import { CaseList } from "@/components/evals/case-list";
import { useCaseList } from "@/lib/evals/use-case-list";

export function SuiteCases({ suiteId }: { readonly suiteId: string }) {
  const { cases, error, loading, paging } = useCaseList({
    order: "desc",
    q: null,
    sort: "recent",
    suite: suiteId,
    tag: null,
  });

  return (
    <CaseList cases={cases} error={error} loading={loading} paging={paging} />
  );
}
