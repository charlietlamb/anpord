import type { EvalCell, EvalTask } from "@anpord/schema/domain/evals";
import { RAIL_FRAME } from "@anpord/ui/lib/rail-frame";
import { cn } from "@anpord/ui/lib/utils";

/* Tighter than the prompt rail: these sections are three facts each rather
   than lists, so the space between them can close without them running
   together. */
const RAIL_GAP = "gap-5";

import {
  ArrowsLeftRightIcon,
  CheckCircleIcon,
  ProhibitIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react";
import { CellHistory } from "@/components/evals/cell-history";
import { VariantFacts } from "@/components/evals/variant-facts";
import { VerdictLine } from "@/components/evals/verdict-line";
import { VoidReason } from "@/components/evals/void-reason";
import { RailFact } from "@/components/rail/rail-fact";
import { RailSection } from "@/components/rail/rail-section";

/* Three states rather than two: a cell that never agreed reads differently
   from one that stopped, and only the second is a finding. */
const agreementOf = (deterministic: boolean, lost: boolean) => {
  if (lost) {
    return "no longer deterministic";
  }

  return deterministic ? "deterministic" : "varies";
};

/**
 * What the cell is and how it has read before, beside the trials that produced
 * this reading.
 */
export function CellRail({
  cell,
  cellKey,
  task,
}: {
  readonly cell: EvalCell;
  readonly cellKey: string;
  readonly task: EvalTask | undefined;
}) {
  const distribution = cell.distribution;
  const lostAgreement = cell.comparison?.determinismLost === true;

  /* Every void trial in a cell says the same thing, so the reason is stated
     once rather than repeated down the table. */
  const voidFields = [
    ...new Set(cell.trials.flatMap((trial) => trial.voidFields)),
  ];

  return (
    <aside className={cn(RAIL_FRAME, RAIL_GAP)}>
      <RailSection title="Reading">
        <div className="flex flex-col gap-2">
          {distribution === null ? (
            <p className="text-muted-foreground text-xs">
              Nothing recorded yet.
            </p>
          ) : (
            <div className="flex flex-col">
              <RailFact
                hint="Trials that passed, out of those that produced evidence to score."
                Icon={CheckCircleIcon}
                label="passed"
                value={`${distribution.passed}/${distribution.scored}`}
              />

              {distribution.voided > 0 ? (
                <RailFact
                  hint="Trials that produced no evidence, so nothing could be scored either way."
                  Icon={ProhibitIcon}
                  label="void"
                  tone="warning"
                  value={String(distribution.voided)}
                />
              ) : null}

              {/* A cell that still passes as often but no longer agrees
                  with itself has regressed, and no single score can express
                  that. Said on the row it is about rather than beside the
                  verdict, where it restated this one. */}
              <RailFact
                hint={
                  lostAgreement
                    ? "This cell used to agree with itself and no longer does. The pass rate can hold while the agent becomes unreliable, which no single score expresses."
                    : "Whether every scored trial agreed. A cell that stops agreeing with itself has regressed even when the pass rate holds."
                }
                Icon={ArrowsLeftRightIcon}
                label="agreement"
                tone={lostAgreement ? "warning" : undefined}
                value={agreementOf(distribution.deterministic, lostAgreement)}
              />

              <RailFact
                hint="Commands run per trial, lowest to highest."
                Icon={TerminalWindowIcon}
                label="commands"
                value={
                  distribution.commandMin === distribution.commandMax
                    ? String(distribution.commandMin)
                    : `${distribution.commandMin}-${distribution.commandMax}`
                }
              />
            </div>
          )}

          <VerdictLine comparison={cell.comparison} />
          <VoidReason fields={voidFields} />
        </div>
      </RailSection>

      {task ? (
        <RailSection title="Variant">
          <VariantFacts
            harness={task.harness}
            harnessVersion={task.harnessVersion}
            model={task.model}
            provider={task.provider}
          />
        </RailSection>
      ) : null}

      <RailSection title="History">
        <CellHistory cellKey={cellKey} />
      </RailSection>
    </aside>
  );
}
