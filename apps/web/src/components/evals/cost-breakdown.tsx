import type { EvalCostComponent, EvalCosts } from "@anpord/schema/domain/evals";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import { CostLine } from "@/components/evals/cost-line";

const ORDER: readonly EvalCostComponent["component"][] = [
  "model",
  "harness",
  "sandbox",
  "platform",
];

export function CostBreakdown({ costs }: { readonly costs: EvalCosts }) {
  const byComponent = new Map(
    costs.components.map((part) => [part.component, part])
  );

  return (
    <div className="flex flex-col">
      {ORDER.map((name) => {
        const part = byComponent.get(name);

        return part === undefined ? null : <CostLine key={name} part={part} />;
      })}

      {costs.incomplete ? (
        <RailFact
          hint="At least one layer could not be priced, so what is shown is less than what was spent rather than all of it."
          label="incomplete"
          tone="warning"
          value="some layers could not be priced"
        />
      ) : null}
    </div>
  );
}
