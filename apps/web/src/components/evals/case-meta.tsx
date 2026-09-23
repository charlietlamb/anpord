import type { EvalCaseDetail } from "@anpord/schema/domain/evals";
import { AgeCell } from "@/components/evals/age-cell";
import { TagChip } from "@/components/evals/tag-chip";

export function CaseMeta({ subject }: { readonly subject: EvalCaseDetail }) {
  const latest = subject.versions.at(-1);

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted-foreground text-sm">
      <span className="font-mono text-xs">{subject.id}</span>

      {subject.tags.map((tag) => (
        <TagChip key={tag} tag={tag} />
      ))}

      {latest === undefined ? null : (
        <span className="flex items-center gap-1">
          Edited <AgeCell at={latest.createdAt.epochMillis} />
          {latest.author === null ? null : `by ${latest.author}`}
        </span>
      )}
    </span>
  );
}
