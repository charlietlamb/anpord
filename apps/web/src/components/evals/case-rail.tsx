import type { EvalCaseDetail } from "@anpord/schema/domain/evals";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { FolderIcon, HashIcon } from "@phosphor-icons/react";
import { EvalRail } from "@/components/evals/eval-layout";
import { RunVariants } from "@/components/evals/run-variants";
import { TagChip } from "@/components/evals/tag-chip";

export function CaseRail({ subject }: { readonly subject: EvalCaseDetail }) {
  return (
    <EvalRail>
      <RailSection title="Case">
        <div className="flex flex-col">
          <RailFact
            hint="The handle this case keeps across every edit."
            Icon={HashIcon}
            label="id"
            layout="stated"
            value={subject.id}
          />

          {subject.suite === null || subject.suite === subject.name ? null : (
            <RailFact
              Icon={FolderIcon}
              label="suite"
              layout="stated"
              value={subject.suite}
            />
          )}
        </div>

        {subject.tags.length === 0 ? null : (
          <div className="flex flex-wrap gap-1.5">
            {subject.tags.map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
        )}
      </RailSection>

      <RailSection title="Variant">
        <RunVariants tasks={[subject.task]} />
      </RailSection>
    </EvalRail>
  );
}
