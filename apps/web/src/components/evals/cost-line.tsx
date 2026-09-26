import {
  COST_COMPONENT_LABELS,
  type EvalCostComponent,
} from "@anpord/schema/domain/evals";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import { count } from "@anpord/ui/lib/evals/duration";
import {
  CpuIcon,
  CurrencyDollarIcon,
  RobotIcon,
  ScalesIcon,
  StackIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { dollars } from "@/lib/evals/tokens";

const ICONS = {
  judge: ScalesIcon,
  harness: RobotIcon,
  model: CurrencyDollarIcon,
  platform: StackIcon,
  sandbox: CpuIcon,
  user: UserIcon,
} as const;

const units = (detail: Readonly<Record<string, unknown>>, key: string) =>
  typeof detail[key] === "number" ? (detail[key] as number) : null;

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

export function CostLine({ part }: { readonly part: EvalCostComponent }) {
  return (
    <RailFact
      hint={part.explanation}
      Icon={ICONS[part.component]}
      label={COST_COMPONENT_LABELS[part.component]}
      tone={part.usd === null ? "muted" : undefined}
      value={statedAs(part)}
    />
  );
}
