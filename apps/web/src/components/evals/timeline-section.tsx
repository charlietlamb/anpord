import { Badge } from "@anpord/ui/components/ui/badge";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@anpord/ui/components/ui/collapsible";
import { elapsed, wholeSeconds } from "@anpord/ui/lib/evals/duration";
import { CaretRightIcon } from "@phosphor-icons/react";
import { TimelineStep } from "@/components/evals/timeline-step";
import { VerbBadge } from "@/components/evals/verb-badge";
import { countVerbs } from "@/lib/evals/timeline-kinds";
import {
  lengthOf,
  type TimelineSection as Section,
} from "@/lib/evals/timeline-sections";

export function TimelineSection({
  onOpenChange,
  onSelect,
  open,
  section,
  selected,
}: {
  readonly onOpenChange: (open: boolean) => void;
  readonly onSelect: (step: number) => void;
  readonly open: boolean;
  readonly section: Section;
  readonly selected: number | null;
}) {
  const counts = countVerbs(section.steps);
  const length = lengthOf(section);

  return (
    <Collapsible
      className="group/section flex flex-col data-[open]:bg-foreground/[0.015]"
      onOpenChange={onOpenChange}
      open={open}
    >
      <CollapsibleTrigger className="flex h-12 w-full cursor-pointer items-center gap-3 px-4 text-left outline-none transition-colors hover:bg-alpha-4 focus-visible:bg-alpha-4">
        <CaretRightIcon
          aria-hidden="true"
          className="size-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-200 group-data-[open]/section:rotate-90 group-data-[open]/section:text-foreground motion-reduce:transition-none"
        />
        <span className="min-w-0 max-w-md truncate font-medium text-muted-foreground text-sm group-data-[open]/section:text-foreground">
          {section.title.title}
        </span>
        <span className="flex shrink-0 gap-1.5">
          {counts.map(({ count, failed, verb }) => (
            <VerbBadge count={count} failed={failed} key={verb} verb={verb} />
          ))}
        </span>
        <span className="flex-1" />
        {length === null ? null : (
          <Badge className="text-xs tabular-nums" size="xs" variant="quiet">
            {wholeSeconds(length)}
          </Badge>
        )}
        <span className="w-9 shrink-0 text-right text-muted-foreground/70 text-xs tabular-nums">
          {section.offsetMs === null ? "" : elapsed(section.offsetMs)}
        </span>
      </CollapsibleTrigger>

      <CollapsiblePanel>
        {section.steps.map((step) => (
          <TimelineStep
            key={step.index}
            onSelect={() => onSelect(step.index)}
            selected={selected === step.index}
            step={step}
          />
        ))}
      </CollapsiblePanel>
    </Collapsible>
  );
}
