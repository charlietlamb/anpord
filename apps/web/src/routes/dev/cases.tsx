import type { EvalCaseSummary } from "@sphynx/schema/domain/eval-read-models";
import { TooltipProvider } from "@sphynx/ui/components/tooltip";
import { createFileRoute } from "@tanstack/react-router";
import { CASE_DETAIL } from "@/components/dev/case-fixtures";
import { PreviewScreen } from "@/components/dev/preview-screen";
import { CasesTable } from "@/components/evals/cases-table";

export const Route = createFileRoute("/dev/cases")({
  component: CasesPreview,
  ssr: false,
});

const summary = (
  id: string,
  variants: EvalCaseSummary["variants"]
): EvalCaseSummary => ({
  id,
  lastRunAt: CASE_DETAIL.variants[0].lastRunAt,
  name: id,
  suite: CASE_DETAIL.suite,
  tags: CASE_DETAIL.tags,
  variants,
});

const [live, settled] = CASE_DETAIL.variants;

const CASES: readonly EvalCaseSummary[] = [
  summary("a run is still going", [live]),
  summary("every variant has settled", [settled]),
  summary("one of several is going", [live, settled]),
  summary("nothing has run yet", []),
];

function CasesPreview() {
  return (
    <TooltipProvider>
      <PreviewScreen name="Cases list">
        <CasesTable cases={CASES} pagination={null} />
      </PreviewScreen>
    </TooltipProvider>
  );
}
