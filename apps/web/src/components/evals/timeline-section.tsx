import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@anpord/ui/components/ui/collapsible";
import { elapsed, wholeSeconds } from "@anpord/ui/lib/evals/duration";
import { CaretRightIcon } from "@phosphor-icons/react";
import { TimelineSteps } from "@/components/evals/timeline-steps";
import { VerbBadge } from "@/components/evals/verb-badge";
import { countVerbs } from "@/lib/evals/timeline-kinds";
import {
  lengthOf,
  type TimelineSection as Section,
  splitOpening,
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
  const length = lengthOf(section);
  const { more, steps } = splitOpening(section);

  return (
    <Collapsible
      className="group/section flex flex-col data-[open]:bg-foreground/[0.015]"
      onOpenChange={onOpenChange}
      open={open}
    >
      <CollapsibleTrigger className="flex h-10 w-full cursor-pointer items-center gap-2.5 px-4 text-left outline-none transition-colors hover:bg-alpha-4 focus-visible:bg-alpha-4">
        <CaretRightIcon
          aria-hidden="true"
          className="size-3 shrink-0 text-muted-foreground/70 transition-transform duration-200 group-data-[open]/section:rotate-90 group-data-[open]/section:text-foreground motion-reduce:transition-none"
        />
        <span className="min-w-0 max-w-xl truncate font-medium text-[13px] text-muted-foreground group-data-[open]/section:text-foreground">
          {section.title.title}
        </span>
        <span className="flex shrink-0 gap-1">
          {countVerbs(section.steps).map(({ count, failed, verb }) => (
            <VerbBadge count={count} failed={failed} key={verb} verb={verb} />
          ))}
        </span>
        <span className="flex-1" />
        <span className="w-12 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
          {length === null ? "" : wholeSeconds(length)}
        </span>
        <span className="w-9 shrink-0 text-right text-muted-foreground/70 text-xs tabular-nums">
          {section.offsetMs === null ? "" : elapsed(section.offsetMs)}
        </span>
      </CollapsibleTrigger>

      <CollapsiblePanel>
        <div className="flex flex-col pb-1.5">
          {more === null ? null : (
            <p className="pr-4 pb-2 pl-[38px] text-muted-foreground text-xs/5">
              {more}
            </p>
          )}
          <TimelineSteps
            onSelect={onSelect}
            selected={selected}
            steps={steps}
          />
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}
