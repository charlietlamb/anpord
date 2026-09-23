import type { EvalCaseDetail } from "@anpord/schema/domain/evals";
import { TagChip } from "@/components/evals/tag-chip";
import { harnessPresentation } from "@/lib/evals/variant-presentation";

const variantsOf = (subject: EvalCaseDetail) => [
  ...new Map(
    subject.history
      .filter((entry) => entry.harness !== "")
      .map((entry) => [
        `${entry.harness}/${entry.model}`,
        { harness: entry.harness, model: entry.model },
      ])
  ).values(),
];

export function CaseMeta({ subject }: { readonly subject: EvalCaseDetail }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted-foreground text-sm">
      <span className="font-mono text-xs">{subject.id}</span>

      {variantsOf(subject).map(({ harness, model }) => {
        const { Icon, label } = harnessPresentation(harness);

        return (
          <span
            className="flex items-center gap-1.5"
            key={`${harness}/${model}`}
          >
            <Icon aria-label={label} className="size-3.5 shrink-0" />
            {model}
          </span>
        );
      })}

      {subject.tags.map((tag) => (
        <TagChip key={tag} tag={tag} />
      ))}
    </span>
  );
}
