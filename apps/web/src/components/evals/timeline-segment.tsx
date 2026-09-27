import { wholeSeconds } from "@anpord/ui/lib/evals/duration";
import { cn } from "@anpord/ui/lib/utils";
import type { CSSProperties } from "react";
import { verbColour } from "@/lib/evals/timeline-kinds";
import { lengthOf, type TimelineSection } from "@/lib/evals/timeline-sections";

const TICK_WIDTH = 2;

const ticksOf = (
  section: TimelineSection,
  from: number,
  width: number,
  active: boolean
): CSSProperties => {
  const ticks = section.steps
    .flatMap((step) =>
      step.offsetMs === null
        ? []
        : [
            {
              colour: active
                ? "var(--color-background)"
                : verbColour(step.title.verb, step.failed),
              left: ((step.offsetMs - from) / width) * 100,
            },
          ]
    )
    .reverse();
  return {
    backgroundImage: ticks
      .map(({ colour }) => `linear-gradient(${colour}, ${colour})`)
      .join(", "),
    backgroundPosition: ticks
      .map(({ left }) => `calc(${left}% + ${(TICK_WIDTH * left) / 100}px) 0`)
      .join(", "),
    backgroundSize: `${TICK_WIDTH}px 100%`,
  };
};

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
      className="group/segment flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-[3px] text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      onClick={onToggle}
      style={{ flexBasis: 0, flexGrow: width }}
      type="button"
    >
      <span
        className={cn(
          "relative h-1.5 w-full overflow-hidden rounded-[2px] bg-no-repeat transition-colors",
          active
            ? "bg-foreground"
            : "bg-alpha-8 group-hover/segment:bg-foreground/20"
        )}
        style={ticksOf(section, from, width, active)}
      />
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            "truncate text-xs",
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
