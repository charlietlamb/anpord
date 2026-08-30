import type { EvalRun } from "@anpord/schema/domain/evals";

export interface WaitOptions {
  readonly maxIntervalMs?: number;
  readonly onProgress?: (run: EvalRun) => void;
  readonly pollIntervalMs?: number;
  readonly signal?: AbortSignal;
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
