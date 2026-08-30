import type { EvalRun } from "@anpord/schema/domain/evals";

export interface WaitOptions {
  /** Ceiling the gap between polls grows to. */
  readonly maxIntervalMs?: number;
  /** Called after every poll, including the last. */
  readonly onProgress?: (run: EvalRun) => void;
  /** First gap between polls. Widens up to `maxIntervalMs`. */
  readonly pollIntervalMs?: number;
  /** Rejects with `EvalAborted` when the signal fires. */
  readonly signal?: AbortSignal;
  /** Rejects with `EvalTimeout` once this much time has passed. */
  readonly timeoutMs?: number;
}

export class EvalTimeout extends Error {
  readonly name = "EvalTimeout";
  readonly runId: string;

  constructor(runId: string, elapsedMs: number) {
    const elapsed =
      elapsedMs < 1000 ? `${elapsedMs}ms` : `${Math.round(elapsedMs / 1000)}s`;
    super(
      `Eval ${runId} was still running after ${elapsed}. It was not cancelled — read it later with evals.get({ id: "${runId}" }).`
    );
    this.runId = runId;
  }
}

export class EvalAborted extends Error {
  readonly name = "EvalAborted";
  readonly runId: string;

  constructor(runId: string) {
    super(
      `Waiting on eval ${runId} was aborted. The run was not cancelled — read it later with evals.get({ id: "${runId}" }).`
    );
    this.runId = runId;
  }
}

const DEFAULT_INTERVAL = 2000;
const DEFAULT_MAX_INTERVAL = 10_000;
const DEFAULT_TIMEOUT = 3_600_000;

/*
 * A coding trial runs for minutes, so a fixed two-second poll spends most of
 * its requests learning nothing. The gap widens toward `maxIntervalMs`, which
 * keeps the first poll responsive for a run that fails immediately without
 * charging a long run one request every two seconds.
 */
const nextInterval = (current: number, max: number) =>
  Math.min(Math.round(current * 1.5), max);

const sleep = (ms: number, signal: AbortSignal | undefined) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(signal?.reason);
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });

/**
 * Polls a run until it stops running.
 *
 * Written against `get` rather than the client so it stays testable without a
 * server, and so the caller's own `evals.get` -- already carrying the API key
 * and base URL -- is the only thing that talks to the API.
 */
export const waitForRun = async (
  get: (options: { readonly id: string }) => Promise<EvalRun>,
  id: string,
  options: WaitOptions = {}
): Promise<EvalRun> => {
  const {
    maxIntervalMs = DEFAULT_MAX_INTERVAL,
    onProgress,
    pollIntervalMs = DEFAULT_INTERVAL,
    signal,
    timeoutMs = DEFAULT_TIMEOUT,
  } = options;

  const startedAt = Date.now();
  let interval = pollIntervalMs;

  for (;;) {
    if (signal?.aborted) {
      throw new EvalAborted(id);
    }

    const run = await get({ id });
    onProgress?.(run);

    if (run.status !== "running") {
      return run;
    }

    const elapsed = Date.now() - startedAt;
    if (elapsed >= timeoutMs) {
      throw new EvalTimeout(id, elapsed);
    }

    try {
      await sleep(Math.min(interval, timeoutMs - elapsed), signal);
    } catch {
      throw new EvalAborted(id);
    }

    interval = nextInterval(interval, maxIntervalMs);
  }
};
