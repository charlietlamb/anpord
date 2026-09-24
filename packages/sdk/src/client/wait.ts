import type { EvalBatch } from "@anpord/schema/domain/evals";

export interface WaitOptions {
  readonly maxIntervalMs?: number;
  readonly onProgress?: (batch: EvalBatch) => void;
  readonly pollIntervalMs?: number;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

export class EvalTimeout extends Error {
  readonly name = "EvalTimeout";
  readonly batchId: string;

  constructor(batchId: string, elapsedMs: number) {
    const elapsed =
      elapsedMs < 1000 ? `${elapsedMs}ms` : `${Math.round(elapsedMs / 1000)}s`;
    super(
      `Batch ${batchId} was still running after ${elapsed}. It was not cancelled; read it later with evals.batches.get({ id: "${batchId}" }).`
    );
    this.batchId = batchId;
  }
}

export class EvalAborted extends Error {
  readonly name = "EvalAborted";
  readonly batchId: string;

  constructor(batchId: string) {
    super(
      `Waiting on batch ${batchId} was aborted. The batch was not cancelled; read it later with evals.batches.get({ id: "${batchId}" }).`
    );
    this.batchId = batchId;
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

export const waitForBatch = async (
  get: (options: { readonly id: string }) => Promise<EvalBatch>,
  id: string,
  options: WaitOptions = {}
): Promise<EvalBatch> => {
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

    const batch = await get({ id });
    onProgress?.(batch);

    if (batch.status !== "running") {
      return batch;
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
