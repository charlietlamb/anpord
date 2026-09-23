import type { EvalCaseDetail } from "@anpord/schema/domain/evals";
import { CaseSetupSheet } from "@/components/evals/case-setup-sheet";
import { CaseVariantMenu } from "@/components/evals/case-variant-menu";
import { RunAllButton } from "@/components/evals/run-all-button";
import { RunVariantButton } from "@/components/evals/run-variant-button";
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
      <CaseSetupSheet setup={detail.setup} />
      {selected === undefined ? (
        <RunAllButton caseId={detail.id} />
      ) : (
        <RunVariantButton caseId={detail.id} entry={selected} />
      )}
    </>
  );
}
