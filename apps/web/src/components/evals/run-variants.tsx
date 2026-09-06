import type { EvalTask } from "@anpord/schema/domain/evals";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import type { ReactNode } from "react";
import {
  HarnessLabel,
  ModelLabel,
  SandboxLabel,
} from "@/components/evals/variant-label";
import { harnessLabel } from "@/lib/evals/variant-presentation";

const harnessKeyOf = (task: EvalTask) =>
  harnessLabel(task.harness, task.harnessVersion, task.profile);

const distinct = <T,>(values: readonly T[], keyOf: (value: T) => string) => {
  const seen = new Map<string, T>();

  for (const value of values) {
    seen.set(keyOf(value), value);
  }

  return [...seen.values()];
};

const Listed = ({ items }: { readonly items: readonly ReactNode[] }) =>
  items.map((item, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: the list is static per render and its items carry no identity of their own
    <span className="inline-flex items-center gap-1.5" key={index}>
      {index === 0 ? null : <span className="text-muted-foreground/50">,</span>}
      {item}
    </span>
  ));

export function RunVariants({
  tasks,
}: {
  readonly tasks: readonly EvalTask[];
}) {
  if (tasks.length === 0) {
    return null;
  }

  const harnesses = distinct(tasks, harnessKeyOf);
  const models = distinct(tasks, (task) => task.model);
  const sandboxes = distinct(tasks, (task) => task.sandbox);

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
                key={harnessKeyOf(task)}
                profile={task.profile}
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
            items={sandboxes.map((task) => (
              <SandboxLabel key={task.sandbox} sandbox={task.sandbox} />
            ))}
          />
        }
      />
    </div>
  );
}
