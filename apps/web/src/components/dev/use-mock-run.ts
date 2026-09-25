import type {
  EvalBatch,
  EvalJournalEntry,
  EvalRun,
  EvalTrial,
} from "@anpord/schema/domain/evals";
import { DateTime } from "effect";
import { useCallback, useEffect, useState } from "react";

const TICK_MS = 400;

interface MockStep {
  readonly afterMs: number;
  readonly entry: EvalJournalEntry;
  /* A command is shown in flight and then again once it settled, so the later
     step replaces the earlier one rather than adding a second row. */
  readonly slot: string;
}

const START = 1_787_000_000_000;

/* Journal entries are placed on a fixed clock so their spans stay stable, but
   what the page prints as an age has to be read against now. */
const at = (offset: number, from: number) => DateTime.unsafeMake(from + offset);

const said = (text: string, role: "assistant" | "user", finished: number) =>
  ({
    _tag: "message",
    finishedAtMillis: START + finished,
    role,
    text,
  }) satisfies EvalJournalEntry;

const ran = (
  command: string,
  started: number,
  finished: number | null,
  output = ""
) =>
  ({
    _tag: "command",
    command,
    exitCode: finished === null ? null : 0,
    finishedAtMillis: finished === null ? null : START + finished,
    output,
    startedAtMillis: START + started,
  }) satisfies EvalJournalEntry;

/* A step lands when the clock passes it, so the timeline fills the way a real
   trial fills rather than appearing whole. */
const SCRIPT: readonly MockStep[] = [
  {
    afterMs: 0,
    entry: said("Add a health endpoint and verify it.", "user", 0),
    slot: "ask",
  },
  {
    afterMs: 2600,
    entry: said("Looking at the routes already here.", "assistant", 2600),
    slot: "reply-1",
  },
  { afterMs: 2800, entry: ran("ls -a src/routes", 2800, null), slot: "ls" },
  {
    afterMs: 4200,
    entry: ran("ls -a src/routes", 2800, 4200, "index.ts\n"),
    slot: "ls",
  },
  {
    afterMs: 4400,
    entry: ran("cat src/routes/index.ts", 4400, null),
    slot: "cat",
  },
  {
    afterMs: 7000,
    entry: ran("cat src/routes/index.ts", 4400, 7000, "…"),
    slot: "cat",
  },
  {
    afterMs: 10_200,
    entry: said("Adding the endpoint now.", "assistant", 10_200),
    slot: "reply-2",
  },
  {
    afterMs: 13_800,
    entry: {
      _tag: "fileChange",
      finishedAtMillis: START + 13_800,
      paths: ["src/routes/health.ts"],
    },
    slot: "write",
  },
  {
    afterMs: 14_000,
    entry: ran("bun test health", 14_000, null),
    slot: "test",
  },
  {
    afterMs: 17_500,
    entry: ran("bun test health", 14_000, 17_500, "1 pass\n"),
    slot: "test",
  },
  {
    afterMs: 20_000,
    entry: said("Health endpoint is in and passing.", "assistant", 20_000),
    slot: "reply-3",
  },
];

const RUN_MS = 23_000;

const CHECKS = [
  { at: 20_400, id: "chk-1", kind: "command", name: "Verify command" },
  { at: 21_200, id: "chk-2", kind: "code", name: "Responds with 200" },
  { at: 21_800, id: "chk-3", kind: "judge", name: "Reads like the others" },
] as const;

/* The script is written on a fixed clock while the page measures spans against
   the real one, so every moment moves to where this run actually started. */
const moved = (value: number | null | undefined, by: number) =>
  value == null ? null : value + by;

const shifted = (entry: EvalJournalEntry, by: number): EvalJournalEntry => {
  const finishedAtMillis = moved(entry.finishedAtMillis, by);

  if (entry._tag === "command" || entry._tag === "toolCall") {
    return {
      ...entry,
      finishedAtMillis,
      startedAtMillis: moved(entry.startedAtMillis, by),
    };
  }

  return { ...entry, finishedAtMillis };
};

/* Checks queue while the agent works, then settle one at a time, so the page
   is seen waiting on them rather than only after they all landed. */
const CHECK_MS = 900;

const captured = (text: string) =>
  ({
    format: "text",
    state: text === "" ? "unavailable" : "captured",
    text,
    truncated: false,
  }) as const;

const checkStatus = (settled: boolean, started: boolean) => {
  if (settled) {
    return "passed" as const;
  }

  return started ? ("running" as const) : ("queued" as const);
};

const validationsAt = (
  elapsed: number,
  from: number
): EvalTrial["validations"] =>
  CHECKS.map((check, index) => {
    const settled = elapsed >= check.at;
    const started = elapsed >= check.at - CHECK_MS;

    return {
      calls: [],
      durationMs: settled ? 420 : null,
      error: null,
      exitCode: settled ? 0 : null,
      id: check.id,
      index,
      input: captured(""),
      kind: check.kind,
      logs: [],
      message: settled ? "Passed" : "",
      name: check.name,
      output: captured(settled ? "ok" : ""),
      startedAt: started ? from + check.at - CHECK_MS : null,
      status: checkStatus(settled, started),
      truncated: false,
    };
  });

const trialOf = (
  trajectory: readonly EvalJournalEntry[],
  done: boolean,
  elapsed: number,
  from: number
) =>
  ({
    artifacts: [],
    commands: trajectory.filter((entry) => entry._tag === "command").length,
    costs: null,
    exitCode: 0,
    failedCommands: 0,
    filesChanged: trajectory.flatMap((entry) =>
      entry._tag === "fileChange" ? entry.paths : []
    ),
    id: "trl_mock",
    modelMs: 8000,
    ordinal: 1,
    sandboxId: null,
    sandboxMs: 2000,
    status: done ? "passed" : "running",
    timed: true,
    trajectory,
    usage: null,
    validations: validationsAt(elapsed, from),
    verifySteps: [],
    voidFields: [],
  }) satisfies EvalTrial;

const runOf = (trial: EvalTrial, done: boolean, from: number) =>
  ({
    batchId: "bat_mock",
    case: { id: "adds-health-endpoint", name: "adds-health-endpoint" },
    costs: null,
    definitionHash: "mock",
    distribution: {
      commandMax: trial.commands,
      commandMedian: trial.commands,
      commandMin: trial.commands,
      deterministic: false,
      failed: 0,
      passRate: done ? 1 : 0,
      passed: done ? 1 : 0,
      scored: done ? 1 : 0,
      trials: 1,
      voided: 0,
    },
    finishedAt: done ? at(RUN_MS, from) : null,
    harnessVersion: "1.0.0",
    id: "run_mock",
    local: true,
    profileVersion: null,
    setup: {
      prepare: null,
      prompt: "Add a health endpoint and verify it.",
      source: { kind: "empty" },
      validator: "health-checks",
      verify: "bun test health",
    },
    startedAt: at(0, from),
    status: done ? "finished" : "running",
    suite: { id: "mock", name: "Mock suite" },
    trials: [trial],
    trigger: null,
    variant: {
      harness: "claude",
      id: "var_mock",
      model: "claude-haiku-4-5",
      profile: null,
      sandbox: "local",
      userModel: null,
    },
  }) as EvalRun;

export function useMockRun() {
  /* One clock: where the run is anchored in real time, how far it has got, and
     whether it is still moving. Pausing keeps the elapsed time it reached. */
  const [clock, setClock] = useState(() => ({
    elapsed: 0,
    playing: true,
    since: Date.now(),
  }));

  useEffect(() => {
    if (!clock.playing) {
      return;
    }

    const id = setInterval(
      () => setClock((was) => ({ ...was, elapsed: Date.now() - was.since })),
      TICK_MS
    );

    return () => clearInterval(id);
  }, [clock.playing]);

  const replay = useCallback(
    () => setClock({ elapsed: 0, playing: true, since: Date.now() }),
    []
  );

  /* Resuming moves the anchor so the elapsed time picks up where it stopped
     rather than jumping by however long the pause lasted. */
  const toggle = useCallback(
    () =>
      setClock((was) => ({
        ...was,
        playing: !was.playing,
        since: was.playing ? was.since : Date.now() - was.elapsed,
      })),
    []
  );

  const { elapsed, playing, since } = clock;
  const done = elapsed >= RUN_MS;
  const shift = since - START;
  const landed = SCRIPT.filter((step) => step.afterMs <= elapsed);
  const trajectory = [
    ...new Map(landed.map((step) => [step.slot, step.entry])).values(),
  ].map((entry) => shifted(entry, shift));
  const trial = trialOf(trajectory, done, elapsed, since);
  const run = runOf(trial, done, since);

  const batch = {
    costs: null,
    failure: null,
    finishedAt: done ? at(RUN_MS, since) : null,
    id: "bat_mock",
    local: true,
    runs: [run],
    startedAt: at(0, since),
    status: done ? "finished" : "running",
    trigger: null,
  } as EvalBatch;

  return {
    batch,
    done,
    elapsed,
    playing,
    replay,
    run,
    toggle,
    trial,
  };
}
