import type { EvalDistribution } from "@anpord/schema/domain/evals";

const Figure = ({
  label,
  value,
  note,
}: {
  readonly label: string;
  readonly note?: string;
  readonly value: string;
}) => (
  <div>
    <div className="text-muted-foreground text-xs">{label}</div>
    <div className="mt-1 font-medium text-lg tabular-nums">{value}</div>
    {note === undefined ? null : (
      <div className="mt-0.5 text-muted-foreground text-xs">{note}</div>
    )}
  </div>
);

const spreadOf = (distribution: EvalDistribution) =>
  distribution.commandMin === distribution.commandMax
    ? `${distribution.commandMin}`
    : `${distribution.commandMin} to ${distribution.commandMax}`;

/**
 * The spread travels with the rate because a rate alone reads as a grade.
 * Ten of ten in nine to eleven commands and seven of ten in nine to forty-one
 * are different findings, and only the second says the cell is unstable.
 */
export function RunDistribution({
  distribution,
}: {
  readonly distribution: EvalDistribution;
}) {
  return (
    <div className="fade-in-0 slide-in-from-bottom-1 animate-in rounded-lg border p-4 ease-out [animation-duration:240ms]">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Figure
          label="Pass rate"
          value={`${distribution.passed}/${distribution.scored}`}
        />
        <Figure
          label="Commands"
          note={`median ${distribution.commandMedian}`}
          value={spreadOf(distribution)}
        />
        <Figure
          label="No evidence"
          note={distribution.voided > 0 ? "not scored" : undefined}
          value={`${distribution.voided}`}
        />
        <Figure
          label="Deterministic"
          value={distribution.deterministic ? "Yes" : "No"}
        />
      </div>

      {distribution.deterministic || distribution.scored < 2 ? null : (
        <p className="mt-4 text-muted-foreground text-sm">
          The trials did not agree, or they disagreed about how much work the
          task takes. A pass rate on its own would hide that.
        </p>
      )}

      {distribution.voided === 0 ? null : (
        <p className="mt-4 text-muted-foreground text-sm">
          {distribution.voided} of {distribution.trials} trials produced no
          evidence and are not counted in the rate.
        </p>
      )}
    </div>
  );
}
