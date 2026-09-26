import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { describeStep, type StepTitle } from "@/lib/evals/step-title";

export interface TimelineStep {
  readonly durationMs: number | null;
  readonly entry: EvalJournalEntry;
  readonly failed: boolean;
  readonly index: number;
  readonly offsetMs: number | null;
  readonly title: StepTitle;
}

export interface TimelineSection {
  readonly durationMs: number | null;
  readonly offsetMs: number | null;
  readonly steps: readonly TimelineStep[];
  readonly title: StepTitle;
}

export type MomentKind = "failed" | "replied" | "wrote";

interface TimelineMoment {
  readonly kind: MomentKind;
  readonly offsetMs: number;
}

export interface Timeline {
  readonly moments: readonly TimelineMoment[];
  readonly sections: readonly TimelineSection[];
  readonly spanMs: number | null;
}

const timelines = new WeakMap<readonly EvalJournalEntry[], Timeline>();

export const buildTimeline = (
  trajectory: readonly EvalJournalEntry[]
): Timeline => {
  const cached = timelines.get(trajectory);

  if (cached !== undefined) {
    return cached;
  }

  const timeline = layoutTimeline(trajectory);
  timelines.set(trajectory, timeline);

  return timeline;
};

export const findSectionIndex = (
  sections: readonly TimelineSection[],
  step: number | null
) =>
  step === null
    ? -1
    : sections.findIndex((section) =>
        section.steps.some((candidate) => candidate.index === step)
      );

export const lengthOf = (section: TimelineSection) =>
  section.durationMs === null || section.durationMs < 1000
    ? null
    : section.durationMs;

export const findLastWorkingSection = (sections: readonly TimelineSection[]) =>
  sections.findLastIndex((section) =>
    section.steps.some((step) => step.entry._tag !== "message")
  );

const finite = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const isTimed = (entry: EvalJournalEntry) =>
  entry._tag === "command" || entry._tag === "toolCall";

const startOf = (entry: EvalJournalEntry) =>
  (isTimed(entry) && "startedAtMillis" in entry
    ? finite(entry.startedAtMillis)
    : null) ?? finite(entry.finishedAtMillis);

const isFailure = (entry: EvalJournalEntry) =>
  (entry._tag === "command" &&
    entry.exitCode !== null &&
    entry.exitCode !== 0) ||
  (entry._tag === "toolCall" && entry.error !== undefined);

const classifyMoment = (
  step: TimelineStep,
  opening: boolean
): MomentKind | null => {
  if (step.failed) {
    return "failed";
  }

  if (step.entry._tag === "fileChange") {
    return "wrote";
  }

  return step.title.verb === "you" && !opening ? "replied" : null;
};

const splitAtMessages = (steps: readonly TimelineStep[]) =>
  steps.reduce<TimelineStep[][]>((groups, step) => {
    const current = groups.at(-1);

    if (current === undefined || step.entry._tag === "message") {
      groups.push([step]);
    } else {
      current.push(step);
    }

    return groups;
  }, []);

const firstOffset = (steps: readonly TimelineStep[]) =>
  steps.find((step) => step.offsetMs !== null)?.offsetMs ?? null;

const layoutTimeline = (trajectory: readonly EvalJournalEntry[]): Timeline => {
  const moments = trajectory.flatMap((entry) =>
    [startOf(entry), finite(entry.finishedAtMillis)].filter(
      (value): value is number => value !== null
    )
  );
  const origin = moments.length > 0 ? Math.min(...moments) : null;
  const spanMs = origin === null ? null : Math.max(...moments) - origin;

  const steps = trajectory.map((entry, index): TimelineStep => {
    const started = startOf(entry);
    const finished = finite(entry.finishedAtMillis);

    return {
      durationMs:
        isTimed(entry) &&
        started !== null &&
        finished !== null &&
        finished > started
          ? finished - started
          : null,
      entry,
      failed: isFailure(entry),
      index,
      offsetMs: started === null || origin === null ? null : started - origin,
      title: describeStep(entry),
    };
  });

  const groups = splitAtMessages(steps);

  const sections = groups.map((group, position): TimelineSection => {
    const offsetMs = firstOffset(group);
    const nextOffset = firstOffset(groups.slice(position + 1).flat()) ?? spanMs;

    return {
      durationMs:
        offsetMs === null || nextOffset === null ? null : nextOffset - offsetMs,
      offsetMs,
      steps: group,
      title: (group[0] as TimelineStep).title,
    };
  });

  const opening = steps.find((step) => step.title.verb === "you");

  return {
    moments: steps.flatMap((step) => {
      const kind = classifyMoment(step, step === opening);
      return kind === null || step.offsetMs === null
        ? []
        : [{ kind, offsetMs: step.offsetMs }];
    }),
    sections,
    spanMs,
  };
};
