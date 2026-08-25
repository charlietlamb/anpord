import type { EvalTask } from "@anpord/schema/domain/evals";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import type { ReactNode } from "react";
import {
  HarnessLabel,
  ModelLabel,
  SandboxLabel,
} from "@/components/evals/variant-label";

const distinct = <T,>(values: readonly T[], keyOf: (value: T) => string) => {
  const seen = new Map<string, T>();

  for (const value of values) {
    seen.set(keyOf(value), value);
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
const Listed = ({ items }: { readonly items: readonly ReactNode[] }) =>
  items.map((item, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: the list is static per render and its items carry no identity of their own
    <span className="inline-flex items-center gap-1.5" key={index}>
      {index === 0 ? null : <span className="text-muted-foreground/50">,</span>}
      {item}
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
  if (tasks.length === 0) {
    return null;
  }

  const harnesses = distinct(
    tasks,
    (task) => `${task.harness} ${task.harnessVersion}`
  );
  const models = distinct(tasks, (task) => task.model);
  const providers = distinct(tasks, (task) => task.provider);

  return (
    <div className="flex flex-col">
      <RailFact
        label="harness"
        layout="stated"
        value={
          <Listed
            items={harnesses.map((task) => (
              <HarnessLabel
                harness={task.harness}
                key={`${task.harness} ${task.harnessVersion}`}
                version={task.harnessVersion}
              />
            ))}
          />
        }
      />
      <RailFact
        label="model"
        layout="stated"
        value={
          <Listed
            items={models.map((task) => (
              <ModelLabel key={task.model} model={task.model} />
            ))}
          />
        }
      />
      <RailFact
        label="sandbox"
        layout="stated"
        value={
          <Listed
            items={providers.map((task) => (
              <SandboxLabel key={task.provider} provider={task.provider} />
            ))}
          />
        }
      />
    </div>
  );
}
