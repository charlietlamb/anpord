import type { EvalCostComponent } from "@anpord/schema/domain/evals";
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
  judge: RobotIcon,
  harness: RobotIcon,
  model: CurrencyDollarIcon,
  platform: StackIcon,
  sandbox: CpuIcon,
} as const;

const LABELS = {
  judge: "judging",
  harness: "harness",
  model: "model",
  platform: "platform",
  sandbox: "sandbox",
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
      label={LABELS[part.component]}
      tone={part.usd === null ? "muted" : undefined}
      value={statedAs(part)}
    />
  );
}
