import { describe, expect, test } from "bun:test";
import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import {
  buildTimeline,
  findLastWorkingSection,
  findSectionIndex,
  findStep,
  isInFlight,
  splitOpening,
  type TimelineSection,
} from "@/lib/evals/timeline-sections";

const message = (
  role: "assistant" | "user",
  at: number | null,
  text = "Working on it."
): EvalJournalEntry => ({ _tag: "message", finishedAtMillis: at, role, text });

const command = (
  at: number | null,
  tookMs: number,
  exitCode = 0
): EvalJournalEntry => ({
  _tag: "command",
  command: "npx atmn push",
  exitCode,
  finishedAtMillis: at === null ? null : at + tookMs,
  output: "",
  startedAtMillis: at,
});

const TRAJECTORY = [
  message("user", 1000, "Set up Pro."),
  message("assistant", 5000),
  command(6000, 900),
  command(8000, 20, 1),
  message("user", 12_000, "Don't push."),
  { _tag: "fileChange", finishedAtMillis: 15_000, paths: ["a.ts"] },
] satisfies EvalJournalEntry[];

describe("buildTimeline", () => {
  const timeline = buildTimeline(TRAJECTORY);

  test("opens a section at every message", () => {
    expect(timeline.sections.map((section) => section.steps.length)).toEqual([
      1, 3, 2,
    ]);
    expect(timeline.sections[2]?.title.title).toBe("Don't push.");
  });

  test("times sections from run start until the next section", () => {
    expect(
      timeline.sections.map((section) => [section.offsetMs, section.durationMs])
    ).toEqual([
      [0, 4000],
      [4000, 7000],
      [11_000, 3000],
    ]);
    expect(timeline.spanMs).toBe(14_000);
  });

  test("times only steps that ran", () => {
    const [, working] = timeline.sections;

    expect(working?.steps.map((step) => step.durationMs)).toEqual([
      null,
      900,
      20,
    ]);
    expect(working?.steps.map((step) => step.failed)).toEqual([
      false,
      false,
      true,
    ]);
  });

  test("marks a failure, a later reply, and a write, but not the brief", () => {
    expect(timeline.moments).toEqual([
      { kind: "failed", offsetMs: 7000 },
      { kind: "replied", offsetMs: 11_000 },
      { kind: "wrote", offsetMs: 14_000 },
    ]);
  });

  test("returns the same timeline for the same trajectory", () => {
    expect(buildTimeline(TRAJECTORY)).toBe(timeline);
  });

  test("leaves an untimed trajectory without offsets", () => {
    const untimed = buildTimeline([message("user", null), command(null, 0)]);

    expect(untimed.spanMs).toBeNull();
    expect(untimed.sections[0]?.durationMs).toBeNull();
  });
});

describe("findSectionIndex", () => {
  const { sections } = buildTimeline(TRAJECTORY);

  test("finds the section holding a step", () => {
    expect(findSectionIndex(sections, 3)).toBe(1);
  });

  test("reports no section for no step", () => {
    expect(findSectionIndex(sections, null)).toBe(-1);
    expect(findSectionIndex(sections, 99)).toBe(-1);
  });
});

describe("findLastWorkingSection", () => {
  test("skips trailing sections that only talk", () => {
    const { sections } = buildTimeline([
      ...TRAJECTORY,
      message("assistant", 16_000, "Done."),
    ]);

    expect(findLastWorkingSection(sections)).toBe(2);
  });

  test("reports none when nothing ran", () => {
    expect(
      findLastWorkingSection(buildTimeline([message("user", 1)]).sections)
    ).toBe(-1);
  });
});

describe("splitOpening", () => {
  test("drops the message a section is titled by", () => {
    const [, working] = buildTimeline(TRAJECTORY).sections;
    const { more, steps } = splitOpening(working as TimelineSection);

    expect(more).toBeNull();
    expect(steps.map((step) => step.entry._tag)).toEqual([
      "command",
      "command",
    ]);
  });

  test("keeps what the title leaves out", () => {
    const [section] = buildTimeline([
      message("assistant", 1, "Writing hello.txt now. It holds one line."),
    ]).sections;

    expect(splitOpening(section as TimelineSection).more).toBe(
      "It holds one line."
    );
  });
});

describe("findStep", () => {
  test("finds a step with the section it sits in", () => {
    const found = findStep(buildTimeline(TRAJECTORY), 3);

    expect(found?.step.index).toBe(3);
    expect(found?.section.title.title).toBe("Working on it.");
  });

  test("finds nothing for no step", () => {
    expect(findStep(buildTimeline(TRAJECTORY), null)).toBeNull();
  });
});

describe("isInFlight", () => {
  test("is a command that started and has not finished", () => {
    expect(isInFlight(command(1000, 0))).toBe(false);
    expect(isInFlight({ ...command(1000, 0), finishedAtMillis: null })).toBe(
      true
    );
  });

  test("is never a step with no times at all", () => {
    expect(isInFlight(command(null, 0))).toBe(false);
  });
});
