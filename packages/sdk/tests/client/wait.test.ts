import { describe, expect, test } from "bun:test";
import type { EvalRun } from "@anpord/schema/domain/evals";
import { EvalAborted, EvalTimeout, waitForRun } from "../../src/client/wait";

const run = (status: EvalRun["status"]) =>
  ({ cells: [], status }) as unknown as EvalRun;

const runningFor = (times: number) => {
  let polls = 0;
  return {
    get: () => {
      polls += 1;
      return Promise.resolve(run(polls <= times ? "running" : "finished"));
    },
    polls: () => polls,
  };
};

const forever = () => Promise.resolve(run("running"));

describe("waitForRun", () => {
  test("resolves once the run stops running", async () => {
    const source = runningFor(2);

    const result = await waitForRun(source.get, "run_1", {
      pollIntervalMs: 1,
    });

    expect(result.status).toBe("finished");
    expect(source.polls()).toBe(3);
  });

  test("a failed run is terminal, not something to keep waiting on", async () => {
    const result = await waitForRun(() => Promise.resolve(run("failed")), "r", {
      pollIntervalMs: 1,
    });

    expect(result.status).toBe("failed");
  });

  test("does not poll again once the run has finished", async () => {
    const source = runningFor(0);

    await waitForRun(source.get, "run_1", { pollIntervalMs: 1 });

    expect(source.polls()).toBe(1);
  });

  test("reports every poll to onProgress, including the last", async () => {
    const seen: string[] = [];

    await waitForRun(runningFor(2).get, "run_1", {
      onProgress: (current) => seen.push(current.status),
      pollIntervalMs: 1,
    });

    expect(seen).toEqual(["running", "running", "finished"]);
  });

  test("throws EvalTimeout carrying the id, because the run keeps going", async () => {
    const attempt = waitForRun(forever, "run_2", {
      pollIntervalMs: 1,
      timeoutMs: 20,
    });

    await expect(attempt).rejects.toThrow(EvalTimeout);
    await attempt.catch((error: EvalTimeout) => {
      expect(error.runId).toBe("run_2");
    });
  });

  test("an already-aborted signal stops before the first request", async () => {
    let polled = false;

    const attempt = waitForRun(
      () => {
        polled = true;
        return forever();
      },
      "run_3",
      { signal: AbortSignal.abort() }
    );

    await expect(attempt).rejects.toThrow(EvalAborted);
    expect(polled).toBe(false);
  });

  test("aborting mid-wait rejects rather than waiting out the interval", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5);

    const attempt = waitForRun(forever, "run_4", {
      pollIntervalMs: 50,
      signal: controller.signal,
    });

    await expect(attempt).rejects.toThrow(EvalAborted);
  });

  test("widens the gap between polls up to the ceiling", async () => {
    const stamps: number[] = [];
    const started = Date.now();

    await waitForRun(
      () => {
        stamps.push(Date.now() - started);
        return Promise.resolve(
          run(stamps.length <= 4 ? "running" : "finished")
        );
      },
      "run_5",
      { maxIntervalMs: 30, pollIntervalMs: 10 }
    );

    const gaps = stamps.slice(1).map((at, index) => at - (stamps[index] ?? 0));

    expect(gaps.length).toBe(4);

    expect(gaps[0]).toBeGreaterThanOrEqual(8);
    expect(gaps.at(-1)).toBeGreaterThanOrEqual(25);
  });
});
