import { TimelineStep } from "@/components/evals/timeline-step";
import type { TimelineStep as Step } from "@/lib/evals/timeline-sections";
import { useVirtualRows } from "@/lib/use-virtual-rows";

const STEP_HEIGHT = 32;
const NOTHING_PINNED: readonly number[] = [];

export function TimelineSteps({
  onSelect,
  selected,
  steps,
}: {
  readonly onSelect: (step: number) => void;
  readonly selected: number | null;
  readonly steps: readonly Step[];
}) {
  const { height, listRef, measureRow, rows } = useVirtualRows<HTMLDivElement>({
    count: steps.length,
    pinned: NOTHING_PINNED,
    rowHeight: STEP_HEIGHT,
  });

  return (
    <div className="relative" ref={listRef} style={{ height }}>
      {rows.map(({ index, offset }) => {
        const step = steps[index] as Step;
        return (
          <div
            className="absolute inset-x-0 top-0"
            data-index={index}
            key={step.index}
            ref={measureRow}
            style={{ transform: `translateY(${offset}px)` }}
          >
            <TimelineStep
              onSelect={() => onSelect(step.index)}
              selected={selected === step.index}
              step={step}
            />
          </div>
        );
      })}
    </div>
  );
}
