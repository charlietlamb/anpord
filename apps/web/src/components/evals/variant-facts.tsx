import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import {
  harnessLabel,
  harnessPresentation,
  modelPresentation,
  providerPresentation,
} from "@/lib/evals/variant-presentation";

/**
 * The three things that define a column.
 *
 * Stated rather than labelled: `Daytona` does not need the word `sandbox` in
 * front of it, and a label across a gap makes an eye travel for a fact it
 * already had. The mark carries the kind and the value carries itself.
 *
 * Kept together because they are one identity rather than three facts: a run
 * compared on harness alone is compared against a different thing.
 */
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
      <RailFact
        Icon={harnessOwn.Icon}
        label="harness"
        layout="stated"
        value={harnessLabel(harness, harnessVersion)}
      />
      <RailFact
        Icon={modelOwn.Icon}
        label="model"
        layout="stated"
        value={modelOwn.label}
      />
      <RailFact
        Icon={providerOwn.Icon}
        label="sandbox"
        layout="stated"
        value={providerOwn.label}
      />
    </div>
  );
}
