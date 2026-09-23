import type { EvalCaseSummary } from "@anpord/schema/domain/evals";
import { OutcomeSummary } from "@/components/evals/outcome-summary";
import { SignalTip } from "@/components/evals/signal-tip";
import { TagChip } from "@/components/evals/tag-chip";
import { ListRow, RowTitle } from "@/components/layout/list-row";
import { counted } from "@/lib/evals/conversation";
import { useShortAge } from "@/lib/use-relative-time";

export function CaseRow({ subject }: { readonly subject: EvalCaseSummary }) {
  const age = useShortAge(new Date(subject.lastRunAtMillis));
  const { passed, scored, voided } = subject.distribution;

  return (
    <ListRow
      meta={
        <>
          <span className="flex w-16 justify-end">
            <OutcomeSummary passed={passed} scored={scored} voided={voided} />
          </span>

          <span className="flex w-20 justify-end text-muted-foreground text-xs">
            {subject.harness}
          </span>

          <span className="flex w-12 justify-end">
            <SignalTip
              className="whitespace-nowrap tabular-nums"
              label={counted(subject.runCount, "run", "runs")}
            >
              ×{subject.runCount}
            </SignalTip>
          </span>

          <span className="flex w-16 justify-end">
            {age === null ? null : (
              <SignalTip
                className="whitespace-nowrap tabular-nums"
                label={`Last run ${new Date(subject.lastRunAtMillis).toLocaleString()}`}
              >
                {age} ago
              </SignalTip>
            )}
          </span>
        </>
      }
      params={{ caseId: subject.caseId }}
      to="/evals/cases/$caseId"
    >
      <RowTitle>{subject.name}</RowTitle>

      {/* The suite is shown only where it says something the name does not:
          a single-case eval repeats itself otherwise. */}
      {subject.suite === null || subject.suite === subject.name ? null : (
        <span className="ml-2 truncate text-muted-foreground/60 text-xs">
          {subject.suite}
        </span>
      )}

      {subject.tags.length === 0 ? null : (
        <span className="ml-1.5 flex gap-1.5">
          {subject.tags.map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
        </span>
      )}
    </ListRow>
  );
}
