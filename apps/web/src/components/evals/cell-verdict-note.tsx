import type { EvalCell } from "@anpord/schema/domain/evals";

/**
 * What a verdict badge cannot fit.
 *
 * Its own line under the row rather than beside the badge: an incomparable
 * reason is a sentence, and a cell that stopped agreeing with itself has
 * regressed in a way no delta expresses. Absent when there is nothing to add,
 * so a clean grid stays a grid.
 */
export function CellVerdictNote({ cell }: { readonly cell: EvalCell }) {
  const comparison = cell.comparison;

  if (comparison === null) {
    return null;
  }

  const notes = [
    comparison.verdict === "incomparable" ? comparison.reason : null,
    comparison.determinismLost ? "no longer deterministic" : null,
    comparison.baselineHarnessVersion === comparison.candidateHarnessVersion
      ? null
      : `harness ${comparison.baselineHarnessVersion} → ${comparison.candidateHarnessVersion}`,
  ].filter((note): note is string => note !== null);

  if (notes.length === 0) {
    return null;
  }

  return (
    <p className="pl-2 text-muted-foreground text-xs">{notes.join(" · ")}</p>
  );
}
