import type { EvalCaseDetail } from "@anpord/schema/domain/evals";
import { TagChip } from "@/components/evals/tag-chip";
import { AgeCell } from "@/components/layout/age-cell";

export function CaseMeta({ subject }: { readonly subject: EvalCaseDetail }) {
  const latest = subject.versions.at(-1);

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted-foreground text-sm">
      <span className="text-foreground">{subject.suite.name}</span>

      <span className="font-mono text-xs">{subject.id}</span>

      {subject.tags.map((tag) => (
        <TagChip key={tag} tag={tag} />
      ))}

      {latest === undefined ? null : (
        <span className="flex items-center gap-1">
          <span>Edited</span>
          <AgeCell at={latest.createdAt.epochMillis} />
          {latest.author === null ? null : <span>by {latest.author}</span>}
        </span>
      )}
    </span>
  );
}
