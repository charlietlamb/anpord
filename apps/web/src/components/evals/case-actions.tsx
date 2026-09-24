import type { EvalCaseDetail } from "@anpord/schema/domain/evals";
import { SlidersHorizontalIcon } from "@phosphor-icons/react";
import { CaseSetup } from "@/components/evals/case-setup";
import { CaseVariantMenu } from "@/components/evals/case-variant-menu";
import { RunCaseButton } from "@/components/evals/run-case-button";
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
        description="How the newest version of this case is set up and judged."
        flush
        icon={SlidersHorizontalIcon}
        title="Setup"
        trigger="Setup"
      >
        <CaseSetup setup={detail.setup} />
      </SideSheet>
      <RunCaseButton caseId={detail.id} variant={selected?.variant ?? null} />
    </>
  );
}
