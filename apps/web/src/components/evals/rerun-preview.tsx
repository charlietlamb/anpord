import type {
  RerunPlan,
  RerunSkip,
  RerunSkipReason,
  RerunSlot,
} from "@sphynx/schema/domain/eval-rerun";
import {
  DataTable,
  DataTableBody,
  DataTableFooter,
  DataTableHead,
} from "@sphynx/ui/components/ui/data-table";
import { counted } from "@sphynx/ui/lib/evals/counted";
import { RerunPreviewRow } from "@/components/evals/rerun-preview-row";
import { RERUN_SLOTS_TABLE } from "@/lib/evals/rerun-tables";

const NOTHING_MATCHES = "Nothing in this suite matches what you picked.";

const SKIP_COPY: Record<RerunSkipReason, string> = {
  neverRun: "never run, so there is nothing to repeat",
  nothingFailed: "nothing failed",
  onlyLocal: "only ever ran on your own machine",
  overBatchLimit: "over what one batch can hold",
};

const SKIP_ORDER: readonly RerunSkipReason[] = [
  "nothingFailed",
  "neverRun",
  "onlyLocal",
  "overBatchLimit",
];

const slotKey = (slot: RerunSlot) =>
  slot.variant.kind === "existing"
    ? `${slot.caseId}/${slot.variant.variant.id}`
    : `${slot.caseId}/fresh`;

const tally = (slots: readonly RerunSlot[], trials: number) => {
  const cases = new Set(slots.map((slot) => slot.caseId)).size;

  return `${counted(slots.length, "run", "runs")} across ${counted(cases, "case", "cases")}, ${counted(slots.length * trials, "trial", "trials")} in all`;
};

const grouped = (skipped: readonly RerunSkip[]) =>
  SKIP_ORDER.map(
    (reason) =>
      [reason, skipped.filter((skip) => skip.reason === reason)] as const
  ).filter(([, cases]) => cases.length > 0);

export function RerunPreview({ plan }: { readonly plan: RerunPlan }) {
  const groups = grouped(plan.skipped);

  return (
    <div className="flex flex-col gap-3">
      {plan.slots.length === 0 ? (
        <p className="px-1 text-label text-muted-foreground">
          {NOTHING_MATCHES}
        </p>
      ) : (
        <DataTable
          columns={RERUN_SLOTS_TABLE.columns}
          label={RERUN_SLOTS_TABLE.label}
        >
          <DataTableHead headings={RERUN_SLOTS_TABLE.headings} />

          <DataTableBody className="max-h-64 overflow-y-auto">
            {plan.slots.map((slot) => (
              <RerunPreviewRow key={slotKey(slot)} slot={slot} />
            ))}
          </DataTableBody>

          <DataTableFooter>{tally(plan.slots, plan.trials)}</DataTableFooter>
        </DataTable>
      )}

      {groups.length === 0 ? null : (
        <ul className="flex flex-col gap-1 px-1 text-label text-muted-foreground">
          {groups.map(([reason, cases]) => (
            <li className="flex min-w-0 items-baseline gap-2" key={reason}>
              <span className="shrink-0">
                {`${counted(cases.length, "case", "cases")} left out, ${SKIP_COPY[reason]}`}
              </span>
              <span className="min-w-0 truncate text-muted-foreground/70">
                {cases.map((skip) => skip.caseName).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
