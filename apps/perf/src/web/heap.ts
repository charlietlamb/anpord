import type { BrowserContext } from "puppeteer-core";
import { JOURNAL_COMMANDS } from "../seed/journal";

export interface HeapReading {
  readonly domNodes: number;
  readonly heapUsedBytes: number;
  readonly openMs: number;
  readonly snapshotBytes: number;
}

const SETTLE_MS = 1000;

export const heapAfterOpening = async (
  browser: BrowserContext,
  url: string
): Promise<HeapReading> => {
  const page = await browser.newPage();
  try {
    const began = performance.now();
    await page.goto(url, { timeout: 60_000, waitUntil: "networkidle0" });
    const openMs = performance.now() - began;
    if (new URL(page.url()).pathname !== new URL(url).pathname) {
      throw new Error(
        `Opening ${url} landed on ${page.url()}, so the heap is not the trial's.`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    const text = await page.evaluate(() => document.body.innerText);
    if (!JOURNAL_COMMANDS.some((command) => text.includes(command))) {
      throw new Error(
        `${url} did not render the seeded journal, so the heap reading would be of the wrong page.`
      );
    }

    const session = await page.createCDPSession();
    await session.send("HeapProfiler.enable");
    await session.send("HeapProfiler.collectGarbage");
    const usage = await session.send("Runtime.getHeapUsage");
    await session.send("Performance.enable");
    const { metrics } = await session.send("Performance.getMetrics");

    let snapshotBytes = 0;
    session.on("HeapProfiler.addHeapSnapshotChunk", ({ chunk }) => {
      snapshotBytes += Buffer.byteLength(chunk);
    });
    await session.send("HeapProfiler.takeHeapSnapshot", {
      reportProgress: false,
    });

    return {
      domNodes: metrics.find((metric) => metric.name === "Nodes")?.value ?? 0,
      heapUsedBytes: usage.usedSize,
      openMs,
      snapshotBytes,
    };
  } finally {
    await page.close();
  }
};
