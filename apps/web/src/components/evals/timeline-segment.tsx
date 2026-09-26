import { wholeSeconds } from "@anpord/ui/lib/evals/duration";
import { cn } from "@anpord/ui/lib/utils";
import type { CSSProperties } from "react";
import { verbColour } from "@/lib/evals/timeline-kinds";
import { lengthOf, type TimelineSection } from "@/lib/evals/timeline-sections";

export function TimelineSegment({
  active,
  onToggle,
  section,
}: {
  readonly active: boolean;
  readonly onToggle: () => void;
  readonly section: TimelineSection;
}) {
  const from = section.offsetMs ?? 0;
  const width = Math.max(section.durationMs ?? 0, 1);
  const length = lengthOf(section);

  return (
    <button
      aria-label={`${active ? "Collapse" : "Expand"} ${section.title.title}`}
      aria-pressed={active}
      className="group/segment flex min-w-0 cursor-pointer flex-col gap-2 rounded-[3px] text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      onClick={onToggle}
      style={{ flexBasis: 0, flexGrow: width }}
      type="button"
    >
      <span
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-[3px] transition-colors",
          active
            ? "bg-foreground"
            : "bg-alpha-8 group-hover/segment:bg-foreground/20"
        )}
      >
        {section.steps.map((step) =>
          step.offsetMs === null ? null : (
            <span
              className={cn(
                "absolute top-0 h-2 w-0.5 rounded-[1px]",
                active ? "bg-background" : "bg-(--tint)"
              )}
              key={step.index}
              style={
                {
                  "--tint": verbColour(step.title.verb, step.failed),
                  left: `${((step.offsetMs - from) / width) * 100}%`,
                } as CSSProperties
              }
            />
          )
        )}
      </span>
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            "truncate text-label",
            active ? "font-medium text-foreground" : "text-muted-foreground"
          )}
        >
          {section.title.title}
        </span>
        <span className="text-muted-foreground/70 text-xs tabular-nums">
          {length === null ? "" : wholeSeconds(length)}
        </span>
      </span>
    </button>
  );
}
