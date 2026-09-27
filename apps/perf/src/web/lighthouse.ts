import lighthouse from "lighthouse";
import type { BrowserContext } from "puppeteer-core";

export interface PageLoad {
  readonly cls: number;
  readonly fcpMs: number;
  readonly lcpMs: number;
  readonly requests: number;
  readonly score: number;
  readonly scriptBytes: number;
  readonly scriptTransferBytes: number;
  readonly styleBytes: number;
  readonly styleTransferBytes: number;
  readonly tbtMs: number;
  readonly ttfbMs: number;
}

interface NetworkItem {
  readonly resourceSize?: number;
  readonly resourceType?: string;
  readonly transferSize?: number;
}

const sumOf = (
  items: readonly NetworkItem[],
  type: string,
  field: "resourceSize" | "transferSize"
) =>
  items
    .filter((item) => item.resourceType === type)
    .reduce((total, item) => total + (item[field] ?? 0), 0);

export const auditPage = async (
  browser: BrowserContext,
  url: string
): Promise<PageLoad> => {
  const page = await browser.newPage();
  try {
    const session = await page.createCDPSession();
    await session.send("Network.clearBrowserCache");
    await session.detach();
    const result = await lighthouse(
      url,
      {
        disableStorageReset: true,
        logLevel: "error",
        onlyCategories: ["performance"],
        output: "json",
      },
      undefined,
      page
    );
    const report = result?.lhr;
    if (report === undefined || report.runtimeError !== undefined) {
      throw new Error(
        `Lighthouse could not audit ${url}: ${report?.runtimeError?.message ?? "no report"}`
      );
    }
    const landed = new URL(report.finalDisplayedUrl).pathname;
    if (landed !== new URL(url).pathname) {
      throw new Error(
        `Lighthouse was sent to ${landed} instead of ${url}, so the page was not measured signed in.`
      );
    }
    const numeric = (id: string) =>
      report.audits[id]?.numericValue ?? Number.NaN;
    const details = report.audits["network-requests"]?.details as
      | { readonly items?: readonly NetworkItem[] }
      | undefined;
    const items = details?.items ?? [];
    return {
      cls: numeric("cumulative-layout-shift"),
      fcpMs: numeric("first-contentful-paint"),
      lcpMs: numeric("largest-contentful-paint"),
      requests: items.length,
      score: (report.categories.performance?.score ?? 0) * 100,
      scriptBytes: sumOf(items, "Script", "resourceSize"),
      scriptTransferBytes: sumOf(items, "Script", "transferSize"),
      styleBytes: sumOf(items, "Stylesheet", "resourceSize"),
      styleTransferBytes: sumOf(items, "Stylesheet", "transferSize"),
      tbtMs: numeric("total-blocking-time"),
      ttfbMs: numeric("server-response-time"),
    };
  } finally {
    await page.close();
  }
};
