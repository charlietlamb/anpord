import type {
  EvalCase,
  EvalCell,
  EvalTask,
  StartEvalRequest,
} from "@anpord/schema/domain/evals";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { startEvalRun } from "@/lib/evals-client";
import { evalKeys } from "@/lib/query/eval-keys";
import { evalQueries } from "@/lib/query/eval-queries";

const firstCase: EvalCase = {
  goal: "the test fails, fix total.mjs so it passes. do not edit the test.",
  metadata: {},
  name: "fix-total",
  setup: null,
  source: {
    files: {
      "total.mjs":
        "export const total = (items) =>\n  items.reduce((sum, item) => sum + item, 0) - 1;\n",
      "total.test.mjs": [
        'import assert from "node:assert/strict";',
        'import { test } from "node:test";',
        'import { total } from "./total.mjs";',
        "",
        'test("total sums its items", () => {',
        "  assert.equal(total([1, 2, 3]), 6);",
        "});",
        "",
      ].join("\n"),
    },
    kind: "files",
  },
  verify: "node --test 2>&1",
};

/* A task carries a client-side id so a row keeps its identity while its model
   is being typed. The id never leaves the browser: the API takes the task
   itself, and position is what the grid columns are keyed by. */
export interface EditableTask extends EvalTask {
  readonly id: string;
}

let taskCounter = 0;
const newTask = (model: string): EditableTask => {
  taskCounter += 1;
  return {
    harness: "codex",
    id: `task-${taskCounter}`,
    model,
    provider: "daytona",
  };
};

const nextCase = (index: number): EvalCase => ({
  goal: "",
  metadata: {},
  name: `case-${index + 1}`,
  setup: null,
  source: { kind: "empty" },
  verify: "node --test 2>&1",
});

/**
 * Everything the playground holds while it is being configured.
 *
 * A hook rather than state scattered through the page, because the page is
 * layout and this is the shape of a run: cases, tasks, a prompt over both, and
 * the run it produced.
 */
export const usePlayground = () => {
  const client = useQueryClient();

  const [prompt, setPrompt] = useState("{{goal}}");
  const [cases, setCases] = useState<readonly EvalCase[]>([firstCase]);
  const [tasks, setTasks] = useState<readonly EditableTask[]>([
    newTask("gpt-5.2"),
  ]);
  const [trials, setTrials] = useState(3);
  const [runId, setRunId] = useState<string | null>(null);
  const [open, setOpen] = useState<EvalCell | undefined>(undefined);

  const run = useQuery({
    ...evalQueries.detail(runId ?? ""),
    enabled: runId !== null,
  });

  const start = useMutation({
    mutationFn: (request: StartEvalRequest) => startEvalRun(request),
    onSuccess: (started) => {
      setRunId(started.id);
      setOpen(undefined);
      client.invalidateQueries({ queryKey: evalKeys.list() });
    },
  });

  /* Re-read from the fresh run so an open cell keeps filling in rather than
     freezing at whatever it held when it was clicked. */
  const selected =
    open === undefined
      ? undefined
      : (run.data?.cells.find(
          (cell) =>
            cell.caseName === open.caseName && cell.taskIndex === open.taskIndex
        ) ?? open);

  return {
    addCase: () => setCases((all) => [...all, nextCase(all.length)]),
    addTask: () => setTasks((all) => [...all, newTask("gpt-5.2-mini")]),
    cases,
    changeCase: (index: number, subject: EvalCase) =>
      setCases((all) =>
        all.map((current, at) => (at === index ? subject : current))
      ),
    changeTask: (index: number, task: EditableTask) =>
      setTasks((all) =>
        all.map((current, at) => (at === index ? task : current))
      ),
    error: start.error,
    open: setOpen,
    prompt,
    removeCase: (index: number) =>
      setCases((all) => all.filter((_, at) => at !== index)),
    removeTask: (index: number) =>
      setTasks((all) => all.filter((_, at) => at !== index)),
    run: run.data,
    running: run.data?.status === "running" || start.isPending,
    selected,
    setPrompt,
    setTrials,
    start: () =>
      start.mutate({
        cases,
        prompt,
        /* The id is the browser's own bookkeeping and is not part of the
           request. */
        tasks: tasks.map(({ harness, model, provider }) => ({
          harness,
          model,
          provider,
        })),
        trials,
      }),
    tasks,
    trials,
  };
};
