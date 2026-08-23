import type { EvalTask } from "@anpord/schema/domain/evals";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import type { ComponentType, ReactNode } from "react";
import {
  harnessLabel,
  harnessPresentation,
  modelPresentation,
  providerPresentation,
} from "@/lib/evals/variant-presentation";

interface Named {
  readonly Icon: ComponentType<{ readonly className?: string }>;
  readonly key: string;
  readonly label: string;
}

const distinct = (values: readonly Named[]) => {
  const seen = new Map<string, Named>();

  for (const value of values) {
    seen.set(value.key, value);
  }

  return [...seen.values()];
};

/**
 * Several values of one kind, on the line that kind occupies.
 *
 * Each keeps its own mark rather than sharing the row's: a grid comparing an
 * OpenAI model against an Anthropic one has two logos on one line, and a
 * single leading icon would claim they came from the same place.
 */
const Listed = ({ values }: { readonly values: readonly Named[] }): ReactNode =>
  values.map((value, index) => (
    <span className="inline-flex items-center gap-1.5" key={value.key}>
      {index === 0 ? null : <span className="text-muted-foreground/50">,</span>}
      <value.Icon className="size-3.5 shrink-0" />
      {value.label}
    </span>
  ));

/**
 * What a run was pointed at, one line per kind.
 *
 * A grid comparing two models on one sandbox holds two columns and one
 * sandbox, so a row per column printed `Codex 0.144.4` and `Daytona` twice and
 * buried the one thing that differed. Grouped by kind, the models sit together
 * on the line that names them and the rest states itself once.
 */
export function RunVariants({
  tasks,
}: {
  readonly tasks: readonly EvalTask[];
}) {
  const harnesses = distinct(
    tasks.map((task) => ({
      Icon: harnessPresentation(task.harness).Icon,
      key: harnessLabel(task.harness, task.harnessVersion),
      label: harnessLabel(task.harness, task.harnessVersion),
    }))
  );

  const models = distinct(
    tasks.map((task) => ({
      Icon: modelPresentation(task.model).Icon,
      key: task.model,
      label: modelPresentation(task.model).label,
    }))
  );

  const providers = distinct(
    tasks.map((task) => ({
      Icon: providerPresentation(task.provider).Icon,
      key: task.provider,
      label: providerPresentation(task.provider).label,
    }))
  );

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <RailFact
        label="harness"
        layout="stated"
        value={<Listed values={harnesses} />}
      />
      <RailFact
        label="model"
        layout="stated"
        value={<Listed values={models} />}
      />
      <RailFact
        label="sandbox"
        layout="stated"
        value={<Listed values={providers} />}
      />
    </div>
  );
}
