import { informational } from "../report/metric";
import { single } from "../report/stats";
import type { Stack } from "../stack/stack";

const MEMORY_EVERY_MS = 100;

export const sampleMemory = (stack: Stack) => {
  let peakRss = 0;
  let peakHeap = 0;
  let stopped = false;
  const loop = (async () => {
    while (!stopped) {
      const memory = await stack.server
        .memory()
        .catch(() => ({ heapUsed: 0, rss: 0 }));
      peakRss = Math.max(peakRss, memory.rss);
      peakHeap = Math.max(peakHeap, memory.heapUsed);
      await new Promise((resolve) => setTimeout(resolve, MEMORY_EVERY_MS));
    }
  })();
  return async () => {
    stopped = true;
    await loop;
    return { peakHeap, peakRss };
  };
};

export const peakMetrics = async (
  stop: () => Promise<{ peakHeap: number; peakRss: number }>
) => {
  const peak = await stop();
  return {
    heap_peak_bytes: informational(single("bytes", peak.peakHeap)),
    rss_peak_bytes: informational(single("bytes", peak.peakRss)),
  };
};
