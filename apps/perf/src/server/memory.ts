import { informational } from "../report/metric";
import { single } from "../report/stats";

const MEMORY_EVERY_MS = 100;

interface Memory {
  readonly heapUsed: number;
  readonly rss: number;
}

export const sampleMemory = (probe: () => Promise<Memory>) => {
  let peakRss = 0;
  let peakHeap = 0;
  let stopped = false;
  let failure: unknown;
  const loop = (async () => {
    while (!stopped) {
      const memory = await probe();
      peakRss = Math.max(peakRss, memory.rss);
      peakHeap = Math.max(peakHeap, memory.heapUsed);
      await new Promise((resolve) => setTimeout(resolve, MEMORY_EVERY_MS));
    }
  })().catch((cause: unknown) => {
    failure = cause;
  });
  return async () => {
    stopped = true;
    await loop;
    if (failure !== undefined) {
      throw new Error(
        `Could not read server memory: ${failure instanceof Error ? failure.message : String(failure)}`
      );
    }
    return { peakHeap, peakRss };
  };
};

const peakMetrics = async (
  stop: () => Promise<{ peakHeap: number; peakRss: number }>
) => {
  const peak = await stop();
  return {
    heap_peak_bytes: informational(single("bytes", peak.peakHeap)),
    rss_peak_bytes: informational(single("bytes", peak.peakRss)),
  };
};

export const stopSamplers = async (
  stops: readonly (() => Promise<{ peakHeap: number; peakRss: number }>)[]
) => {
  const settled = await Promise.allSettled(stops.map(peakMetrics));
  const failure = settled.find((each) => each.status === "rejected");
  if (failure?.status === "rejected") {
    throw failure.reason;
  }
  return settled.flatMap((each) =>
    each.status === "fulfilled" ? [each.value] : []
  );
};
