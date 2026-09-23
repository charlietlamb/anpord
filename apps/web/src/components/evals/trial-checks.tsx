import { validationsOf } from "@anpord/schema/domain/eval-validation-results";
import type { EvalSetup, EvalTrial } from "@anpord/schema/domain/evals";
import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
} from "@anpord/ui/components/ui/data-table";
import { Surface } from "@anpord/ui/components/ui/surface";
import { FileCodeIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { CheckRow } from "@/components/evals/check-row";
import { ValidationDetail } from "@/components/evals/validation-detail";
import { ValidationSource } from "@/components/evals/validation-source";
import { VerifyResults } from "@/components/evals/verify-results";
import { EmptyNote } from "@/components/layout/empty-note";
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
  const validations = validationsOf(trial);
  const open = validations.find((validation) => validation.id === openId);
  const files = setup?.validatorFiles ?? [];
  const passed = validations.filter((entry) => entry.status === "passed");

  if (setup?.validatorName == null && setup?.verifyCommand != null) {
    return (
      <Surface className="p-4">
        <VerifyResults command={setup.verifyCommand} trials={[trial]} />
      </Surface>
    );
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
                title="Source"
                trigger={
                  <>
                    <FileCodeIcon className="size-3.5" />
                    Source
                  </>
                }
              >
                <div className="p-4">
                  <ValidationSource files={files} />
                </div>
              </SideSheet>
            )
          }
        >
          {passed.length}/{validations.length} passed
        </DataTableFooter>
      </DataTable>

      <SideSheet
        onOpenChange={(next) => {
          if (!next) {
            setOpenId(null);
          }
        }}
        open={open !== undefined}
        title={open?.name}
      >
        {open === undefined ? null : (
          <div className="p-4">
            <ValidationDetail validation={open} />
          </div>
        )}
      </SideSheet>
    </>
  );
}
