import type { EvalSetup, EvalTrial } from "@anpord/schema/domain/evals";
import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
} from "@anpord/ui/components/ui/data-table";
import { EmptyNote } from "@anpord/ui/components/ui/empty-note";
import { FileCodeIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { CheckRow } from "@/components/evals/check-row";
import { ValidationDetail } from "@/components/evals/validation-detail";
import { ValidationSource } from "@/components/evals/validation-source";
import { VerifyResults } from "@/components/evals/verify-results";
import { SideSheet } from "@/components/layout/side-sheet";
import { CHECKS_TABLE } from "@/lib/evals/case-tables";

export function TrialChecks({
  setup,
  trial,
}: {
  readonly setup: EvalSetup | null;
  readonly trial: EvalTrial;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const validations = trial.validations;
  const open = validations.find((validation) => validation.id === openId);
  const files = setup?.validatorFiles ?? [];
  const passed = validations.filter((entry) => entry.status === "passed");

  if (setup?.validator == null && setup?.verify != null) {
    return <VerifyResults command={setup.verify} trials={[trial]} />;
  }

  if (validations.length === 0) {
    return (
      <EmptyNote>No check results were recorded for this trial.</EmptyNote>
    );
  }

  return (
    <>
      <DataTable columns={CHECKS_TABLE.columns} label={CHECKS_TABLE.label}>
        <DataTableHead headings={CHECKS_TABLE.headings} />

        <DataTableBody>
          {validations.map((validation) => (
            <CheckRow
              key={validation.id}
              onOpen={() => setOpenId(validation.id)}
              validation={validation}
            />
          ))}
        </DataTableBody>

        <DataTableFooter
          actions={
            files.length === 0 ? undefined : (
              <SideSheet
                description="The validator code these checks ran."
                icon={FileCodeIcon}
                title="Source"
                trigger="Source"
              >
                <ValidationSource files={files} />
              </SideSheet>
            )
          }
        >
          {passed.length}/{validations.length} passed
        </DataTableFooter>
      </DataTable>

      <SideSheet
        onClose={() => setOpenId(null)}
        open={open !== undefined}
        title={open?.name}
      >
        {open === undefined ? null : <ValidationDetail validation={open} />}
      </SideSheet>
    </>
  );
}
