import { span } from "@anpord/ui/lib/evals/duration";
import type { CSSProperties } from "react";
import { TimelineSegment } from "@/components/evals/timeline-segment";
import { TimelineStat } from "@/components/evals/timeline-stat";
import { MOMENT_ORDER, MOMENTS } from "@/lib/evals/timeline-kinds";
import type { Timeline } from "@/lib/evals/timeline-sections";

export function TimelineBand({
  onToggle,
  open,
  spanMs,
  timeline,
}: {
  readonly onToggle: (section: number) => void;
  readonly open: ReadonlySet<number>;
  readonly spanMs: number;
  readonly timeline: Timeline;
}) {
  const steps = timeline.sections.flatMap((section) => section.steps);
  const commands = steps.filter(
    (step) => step.entry._tag === "command" || step.entry._tag === "toolCall"
  ).length;
  const moments = MOMENT_ORDER.filter((kind) =>
    timeline.moments.some((moment) => moment.kind === kind)
  );

  return (
    <div className="flex flex-col gap-3 rounded-md bg-card px-3.5 py-3 shadow-(--shadow-control)">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-5">
          <TimelineStat label="duration" value={span(spanMs)} />
          <TimelineStat label="steps" value={String(steps.length)} />
          <TimelineStat label="commands" value={String(commands)} />
        </div>
        <div className="flex gap-3.5">
          {moments.map((kind) => (
            <span className="flex items-center gap-1.5" key={kind}>
              <span
                className="size-2 rounded-full bg-(--tint)"
                style={{ "--tint": MOMENTS[kind].colour } as CSSProperties}
              />
              <span className="text-muted-foreground text-xs">
                {MOMENTS[kind].label}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-[3px]">
        {timeline.sections.map((section, position) => (
          <TimelineSegment
            active={open.has(position)}
            key={section.steps[0]?.index ?? position}
            onToggle={() => onToggle(position)}
            section={section}
          />
        ))}
      </div>
    </div>
  );
}
