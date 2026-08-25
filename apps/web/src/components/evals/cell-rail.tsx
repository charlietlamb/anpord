import type { EvalCell, EvalTask } from "@anpord/schema/domain/evals";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { RAIL_FRAME } from "@anpord/ui/lib/rail-frame";
import {
  ArrowsLeftRightIcon,
  CheckCircleIcon,
  ProhibitIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react";
import { CellHistory } from "@/components/evals/cell-history";
import { RunVariants } from "@/components/evals/run-variants";
import { VerdictLine } from "@/components/evals/verdict-line";
import { VoidReason } from "@/components/evals/void-reason";

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

  const voidFields = [
    ...new Set(cell.trials.flatMap((trial) => trial.voidFields)),
  ];

  return (
    <aside className={RAIL_FRAME}>
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
                layout="stated"
                tone="positive"
                value={`${distribution.passed}/${distribution.scored} passed`}
              />

              {distribution.voided > 0 ? (
                <RailFact
                  hint="Trials that produced no evidence, so nothing could be scored either way."
                  Icon={ProhibitIcon}
                  label="void"
                  layout="stated"
                  tone="warning"
                  value={`${distribution.voided} void`}
                />
              ) : null}

              <RailFact
                hint={
                  lostAgreement
                    ? "This cell used to agree with itself and no longer does. The pass rate can hold while the agent becomes unreliable, which no single score expresses."
                    : "Whether every scored trial agreed. A cell that stops agreeing with itself has regressed even when the pass rate holds."
                }
                Icon={ArrowsLeftRightIcon}
                label="agreement"
                layout="stated"
                value={agreementOf(distribution.deterministic, lostAgreement)}
              />

              <RailFact
                hint="Commands run per trial, lowest to highest."
                Icon={TerminalWindowIcon}
                label="commands"
                layout="stated"
                value={
                  distribution.commandMin === distribution.commandMax
                    ? `${distribution.commandMin} commands`
                    : `${distribution.commandMin}-${distribution.commandMax} commands`
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
          <RunVariants tasks={[task]} />
        </RailSection>
      ) : null}

      <RailSection title="History">
        <CellHistory cellKey={cellKey} />
      </RailSection>
    </aside>
  );
}
