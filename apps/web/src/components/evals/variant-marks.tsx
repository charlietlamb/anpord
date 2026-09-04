import type { EvalTask } from "@anpord/schema/domain/evals";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import type { ComponentType } from "react";
import {
  harnessLabel,
  modelPresentation,
  providerPresentation,
} from "@/lib/evals/variant-presentation";

const SHOWN = 3;

interface Mark {
  readonly Icon: ComponentType<{ readonly className?: string }>;
  readonly key: string;
  readonly title: string;
}

const marksOf = (columns: readonly EvalTask[]): readonly Mark[] => {
  const models = new Map<string, Mark>();
  const providers = new Map<string, Mark>();

  for (const column of columns) {
    const model = modelPresentation(column.model);
    const provider = providerPresentation(column.provider);

    const harness = harnessLabel(
      column.harness,
      column.harnessVersion,
      column.profile
    );

    /* Keyed by what the tooltip says rather than by the model alone: two
       profiles on one base share a model, and the second would otherwise
       replace the first and name a harness the row never ran. */
    models.set(`${column.model} ${harness}`, {
      Icon: model.Icon,
      key: `model:${column.model} ${harness}`,
      title: `${model.label} · ${harness}`,
    });

    providers.set(column.provider, {
      Icon: provider.Icon,
      key: `provider:${column.provider}`,
      title: provider.label,
    });
  }

  return [...models.values(), ...providers.values()];
};

export function VariantMarks({
  columns,
}: {
  readonly columns: readonly EvalTask[];
}) {
  const marks = marksOf(columns);
  const shown = marks.slice(0, SHOWN);
  const hidden = marks.length - shown.length;

  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {shown.map((mark) => (
        <Tooltip key={mark.key}>
          <TooltipTrigger
            render={
              <span className="flex items-center">
                <mark.Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="sr-only">{mark.title}</span>
              </span>
            }
          />

          <TooltipContent side="top">{mark.title}</TooltipContent>
        </Tooltip>
      ))}

      {hidden > 0 ? (
        <span className="text-muted-foreground/70 text-xs tabular-nums">
          +{hidden}
        </span>
      ) : null}
    </span>
  );
}
