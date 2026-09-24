import type { EvalCaseDetail } from "@anpord/schema/domain/evals";
import { SlidersHorizontalIcon } from "@phosphor-icons/react";
import { CaseSetup } from "@/components/evals/case-setup";
import { CaseVariantMenu } from "@/components/evals/case-variant-menu";
import { RunAllButton } from "@/components/evals/run-all-button";
import { RunVariantButton } from "@/components/evals/run-variant-button";
import { SideSheet } from "@/components/layout/side-sheet";
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
      <SideSheet
        description="How the newest run of this case was set up and judged."
        flush
        icon={SlidersHorizontalIcon}
        title="Setup"
        trigger="Setup"
      >
        <CaseSetup setup={detail.setup} />
      </SideSheet>
      {selected === undefined ? (
        <RunAllButton caseId={detail.id} />
      ) : (
        <RunVariantButton caseId={detail.id} entry={selected} />
      )}
    </>
  );
}
