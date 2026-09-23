import type { EvalCaseDetail } from "@anpord/schema/domain/evals";
import { CaseSetup } from "@/components/evals/case-setup";
import { CaseVariantMenu } from "@/components/evals/case-variant-menu";
import { RunAllButton } from "@/components/evals/run-all-button";
import { RunVariantButton } from "@/components/evals/run-variant-button";
import { SetupSheet } from "@/components/evals/setup-sheet";
import { useSelectedVariant } from "@/lib/evals/use-selected-variant";

export function CaseActions({ detail }: { readonly detail: EvalCaseDetail }) {
  const { select, selected } = useSelectedVariant(detail.variants);

  return (
    <>
      <CaseVariantMenu
        onSelect={select}
        selected={selected}
        variants={detail.variants}
      />
      <SetupSheet description="How the newest run of this case was set up and judged.">
        <CaseSetup bare setup={detail.setup} />
      </SetupSheet>
      {selected === undefined ? (
        <RunAllButton caseId={detail.id} />
      ) : (
        <RunVariantButton caseId={detail.id} entry={selected} />
      )}
    </>
  );
}
