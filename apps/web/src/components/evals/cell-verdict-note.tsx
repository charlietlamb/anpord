import type { EvalCell, EvalComparison } from "@anpord/schema/domain/evals";
import { shortProfileVersion } from "@/lib/evals/profile-version";

/* The profile name is in the cell key but its version is not, so a version change is reported here. */
const profileNote = (comparison: EvalComparison) => {
  const { baselineProfileVersion, candidateProfileVersion } = comparison;

  if (
    baselineProfileVersion === null ||
    candidateProfileVersion === null ||
    baselineProfileVersion === candidateProfileVersion
  ) {
    return null;
  }

  return `profile ${shortProfileVersion(baselineProfileVersion)} → ${shortProfileVersion(candidateProfileVersion)}`;
};

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
    profileNote(comparison),
  ].filter((note): note is string => note !== null);

  if (notes.length === 0) {
    return null;
  }

  return (
    <p className="pl-2 text-muted-foreground text-xs">{notes.join(" · ")}</p>
  );
}
