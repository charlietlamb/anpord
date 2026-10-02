import type { EvalSuiteDetail } from "@sphynx/schema/domain/eval-read-models";
import { AgeCell } from "@sphynx/ui/components/evals/age-cell";
import { counted } from "@sphynx/ui/lib/evals/counted";
import { TagChip } from "@/components/evals/tag-chip";

export function SuiteMeta({ suite }: { readonly suite: EvalSuiteDetail }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted-foreground text-sm">
      <span className="font-mono text-xs">{suite.id}</span>

      <span>{counted(suite.cases, "case", "cases")}</span>

      <span>{counted(suite.variants, "variant", "variants")}</span>

      {suite.tags.map((tag) => (
        <TagChip key={tag} tag={tag} />
      ))}

      {suite.lastRunAt === null ? null : (
        <span className="flex items-center gap-1">
          <span>Last run</span>
          <AgeCell at={suite.lastRunAt.epochMillis} />
        </span>
      )}
    </span>
  );
}
