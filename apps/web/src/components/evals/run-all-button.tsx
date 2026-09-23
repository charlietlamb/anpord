import { RerunButton } from "@/components/evals/rerun-button";
import { useRerunCase } from "@/lib/evals/eval-mutations";

export function RunAllButton({ caseId }: { readonly caseId: string }) {
  return (
    <RerunButton
      label="Run all variants"
      rerun={useRerunCase(caseId)}
      started="Running every variant of this case"
    />
  );
}
