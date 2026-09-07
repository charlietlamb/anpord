import type { EvalCell } from "@anpord/schema/domain/evals";

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
