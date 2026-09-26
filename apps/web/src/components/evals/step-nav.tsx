import { Button } from "@anpord/ui/components/button";
import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";

export function StepNav({
  count,
  onStep,
  step,
}: {
  readonly count: number;
  readonly onStep: (step: number) => void;
  readonly step: number;
}) {
  return (
    <span className="flex items-center gap-0.5">
      <Button
        aria-label="Previous step"
        disabled={step <= 0}
        onClick={() => onStep(step - 1)}
        size="icon-xs"
        variant="ghost"
      >
        <CaretUpIcon />
      </Button>
      <Button
        aria-label="Next step"
        disabled={step >= count - 1}
        onClick={() => onStep(step + 1)}
        size="icon-xs"
        variant="ghost"
      >
        <CaretDownIcon />
      </Button>
    </span>
  );
}
