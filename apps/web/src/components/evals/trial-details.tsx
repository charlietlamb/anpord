import type { EvalTrial } from "@anpord/schema/domain/evals";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { RailSection } from "@anpord/ui/components/ui/rail-section";
import { CostBreakdown } from "@/components/evals/cost-breakdown";
import { TrialCost } from "@/components/evals/trial-cost";
import { TrialOutcome } from "@/components/evals/trial-outcome";
import { TrialTime } from "@/components/evals/trial-time";
import { fileIcon } from "@/lib/evals/file-presentation";

function FileRow({ path }: { readonly path: string }) {
  const Glyph = fileIcon(path);
  const name = path.slice(path.lastIndexOf("/") + 1);

  return (
    <li className="flex min-w-0">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              className="flex min-w-0 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              type="button"
            >
              <Glyph
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground"
              />
              <span className="min-w-0 flex-1 truncate font-mono text-xs">
                {name}
              </span>
            </button>
          }
        />
        <TooltipContent className="max-w-sm" side="left">
          <span className="break-all font-mono text-xs">{path}</span>
        </TooltipContent>
      </Tooltip>
    </li>
  );
}

export function TrialDetails({ trial }: { readonly trial: EvalTrial }) {
  return (
    <div className="flex flex-col gap-6 p-4">
      <TrialOutcome trial={trial} />
      <TrialTime trial={trial} />

      {trial.costs === null ? null : (
        <RailSection title="Cost">
          <CostBreakdown costs={trial.costs} />
        </RailSection>
      )}

      {trial.usage === null ? null : (
        <RailSection title="Usage">
          <TrialCost turns={trial.commands} usage={trial.usage} />
        </RailSection>
      )}

      {trial.filesChanged.length === 0 ? null : (
        <RailSection title="Files changed">
          <ul className="flex flex-col gap-1">
            {trial.filesChanged.map((path) => (
              <FileRow key={path} path={path} />
            ))}
          </ul>
        </RailSection>
      )}
    </div>
  );
}
