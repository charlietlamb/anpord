import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import type { VariantIcon } from "@/lib/evals/variant-presentation";
import {
  harnessLabel,
  harnessPresentation,
  modelPresentation,
  providerPresentation,
} from "@/lib/evals/variant-presentation";

/**
 * The three things that define a column, as rows rather than badges.
 *
 * Badges wrapped: `Codex 0.144.4` and `gpt-5-codex` do not fit a rail side by
 * side, so the third dropped to its own line and the group read as a ragged
 * block rather than a list. As rows they line up with every other fact in the
 * rail and the values stay in one column.
 *
 * Kept together because they are one identity rather than three facts: a run
 * compared on harness alone is compared against a different thing.
 */
function VariantFact({
  Icon,
  label,
  value,
}: {
  readonly Icon: VariantIcon;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <RailFact
      label={label}
      value={
        <span className="flex min-w-0 items-center justify-end gap-1.5">
          <Icon className="size-3.5 shrink-0" />
          <span className="truncate">{value}</span>
        </span>
      }
    />
  );
}

export function VariantFacts({
  harness,
  harnessVersion,
  model,
  provider,
}: {
  readonly harness: string;
  readonly harnessVersion: string;
  readonly model: string;
  readonly provider: string;
}) {
  const harnessOwn = harnessPresentation(harness);
  const modelOwn = modelPresentation(model);
  const providerOwn = providerPresentation(provider);

  return (
    <div className="flex flex-col">
      <VariantFact
        Icon={harnessOwn.Icon}
        label="harness"
        value={harnessLabel(harness, harnessVersion)}
      />
      <VariantFact Icon={modelOwn.Icon} label="model" value={modelOwn.label} />
      <VariantFact
        Icon={providerOwn.Icon}
        label="sandbox"
        value={providerOwn.label}
      />
    </div>
  );
}
