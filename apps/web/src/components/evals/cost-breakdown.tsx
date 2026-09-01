import type { EvalCostComponent, EvalCosts } from "@anpord/schema/domain/evals";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import {
  CpuIcon,
  CurrencyDollarIcon,
  RobotIcon,
  StackIcon,
} from "@phosphor-icons/react";
import { count } from "@/lib/evals/duration";
import { dollars } from "@/lib/evals/tokens";

const ICONS = {
  harness: RobotIcon,
  model: CurrencyDollarIcon,
  platform: StackIcon,
  sandbox: CpuIcon,
} as const;

const LABELS = {
  harness: "harness",
  model: "model",
  platform: "platform",
  sandbox: "sandbox",
} as const;

const units = (detail: Readonly<Record<string, unknown>>, key: string) =>
  typeof detail[key] === "number" ? (detail[key] as number) : null;

/**
 * What a layer cost, said in the terms it is actually known in.
 *
 * A priced layer reads as money and says whether that money is an estimate. An
 * unpriced one reads as words -- what covered it, or that nothing could -- and
 * never as a number, because the only number available would be zero and zero
 * is a claim that it was free.
 */
const statedAs = (part: EvalCostComponent) => {
  if (part.usd !== null) {
    return part.classification === "estimate"
      ? `${dollars(part.usd)} est.`
      : dollars(part.usd);
  }

  if (part.component === "platform") {
    const evalUnits = units(part.detail, "evalUnits");

    return evalUnits === null
      ? "metered in eval units"
      : `${count(evalUnits)} eval units`;
  }

  if (part.classification === "managed") {
    return "run on our account";
  }

  return part.classification === "included" ? "included" : "not known";
};

function CostLine({ part }: { readonly part: EvalCostComponent }) {
  return (
    <RailFact
      hint={part.explanation}
      Icon={ICONS[part.component]}
      label={LABELS[part.component]}
      layout="stated"
      /* Muted wherever there is no amount, so an unpriced layer never reads
         with the weight of a figure somebody could add up. */
      tone={part.usd === null ? "muted" : undefined}
      value={statedAs(part)}
    />
  );
}

const ORDER: readonly EvalCostComponent["component"][] = [
  "model",
  "harness",
  "sandbox",
  "platform",
];

/**
 * What a run cost, layer by layer.
 *
 * Four lines rather than a total. The model estimate is the only figure most
 * runs have, and putting it beside three layers that are covered rather than
 * free is what stops it reading as the bill for all of them.
 */
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
          layout="stated"
          tone="warning"
          value="some layers could not be priced"
        />
      ) : null}
    </div>
  );
}
