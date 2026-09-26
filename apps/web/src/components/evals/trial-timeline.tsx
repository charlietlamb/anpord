import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { EmptyNote } from "@anpord/ui/components/ui/empty-note";
import { Surface } from "@anpord/ui/components/ui/surface";
import { SURFACE_FOOTER } from "@anpord/ui/lib/surface";
import { TimelineBand } from "@/components/evals/timeline-band";
import { TimelineSection } from "@/components/evals/timeline-section";
import { buildTimeline } from "@/lib/evals/timeline-sections";
import { useOpenSections } from "@/lib/evals/use-open-sections";
import { useSelectedStep } from "@/lib/evals/use-selected-step";

export function TrialTimeline({
  running,
  timed,
  trajectory,
}: {
  readonly running: boolean;
  readonly timed: boolean;
  readonly trajectory: readonly EvalJournalEntry[];
}) {
  const timeline = buildTimeline(trajectory);
  const [step, setStep] = useSelectedStep();
  const { open, setSection, toggleSection } = useOpenSections(
    timeline.sections,
    step
  );

  if (trajectory.length === 0) {
    return (
      <Surface>
        <EmptyNote>
          {running
            ? "Waiting for the first step. The agent reads before it acts."
            : "This trial recorded no journal."}
        </EmptyNote>
      </Surface>
    );
  }

  const spanMs = timed ? timeline.spanMs : null;

  return (
    <div className="flex flex-col gap-5">
      {spanMs !== null && spanMs > 0 ? (
        <TimelineBand
          onToggle={toggleSection}
          open={open}
          spanMs={spanMs}
          timeline={timeline}
        />
      ) : null}

      <div className="flex flex-col">
        <div className="flex flex-col divide-y divide-alpha-8 overflow-hidden rounded-md bg-card shadow-(--shadow-control)">
          {timeline.sections.map((section, position) => (
            <TimelineSection
              key={section.steps[0]?.index ?? position}
              onOpenChange={(next) => setSection(position, next)}
              onSelect={(index) => setStep(step === index ? null : index)}
              open={open.has(position)}
              section={section}
              selected={step}
            />
          ))}
        </div>
        {timed ? null : (
          <p className={SURFACE_FOOTER}>
            Durations weren't recorded for this trial, so steps are listed in
            order.
          </p>
        )}
      </div>
    </div>
  );
}
