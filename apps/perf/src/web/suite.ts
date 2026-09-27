import { freePort } from "@anpord/e2e/src/harness/ports";
import type { Metric, SuiteResult, Unit } from "../report/metric";
import { single, summarise } from "../report/stats";
import { DEFAULT_PLAN, type SeedPlan } from "../seed/plan";
import { bootStack } from "../stack/stack";
import { launchChrome, signIn } from "./browser";
import { type HeapReading, heapAfterOpening } from "./heap";
import { auditPage, type PageLoad } from "./lighthouse";
import { largeTrialPath, ROUTES } from "./routes";
import { buildWeb, startWeb } from "./web-server";

export interface WebSettings {
  readonly plan: SeedPlan;
  readonly runs: number;
}

export const DEFAULT_WEB_SETTINGS: WebSettings = {
  plan: DEFAULT_PLAN,
  runs: 3,
};

const PAGE_METRICS: readonly (readonly [keyof PageLoad, string, Unit])[] = [
  ["score", "lighthouse_score", "score"],
  ["lcpMs", "lcp_ms", "ms"],
  ["fcpMs", "fcp_ms", "ms"],
  ["tbtMs", "tbt_ms", "ms"],
  ["cls", "cls", "ratio"],
  ["ttfbMs", "ttfb_ms", "ms"],
  ["scriptBytes", "js_bytes", "bytes"],
  ["scriptTransferBytes", "js_transfer_bytes", "bytes"],
  ["styleBytes", "css_bytes", "bytes"],
  ["styleTransferBytes", "css_transfer_bytes", "bytes"],
  ["requests", "requests", "count"],
];

const HEAP_METRICS: readonly (readonly [keyof HeapReading, string, Unit])[] = [
  ["heapUsedBytes", "heap_used_bytes", "bytes"],
  ["snapshotBytes", "heap_snapshot_bytes", "bytes"],
  ["domNodes", "dom_nodes", "count"],
  ["openMs", "open_ms", "ms"],
];

const collect = <Reading>(
  prefix: string,
  readings: readonly Reading[],
  fields: readonly (readonly [keyof Reading, string, Unit])[]
) =>
  Object.fromEntries(
    fields.map(([field, name, unit]) => [
      `${prefix}.${name}`,
      summarise(
        unit,
        readings.map((reading) => Number(reading[field]))
      ),
    ])
  );

export const runWebSuite = async (
  repositoryRoot: string,
  settings: WebSettings,
  log: (line: string) => void
): Promise<SuiteResult> => {
  const port = await freePort();
  const webOrigin = `http://127.0.0.1:${port}`;
  log("web: creating scratch database and seeding");
  const stack = await bootStack({
    label: "web",
    plan: settings.plan,
    repositoryRoot,
    trustedOrigins: [webOrigin],
  });
  const world = stack.world;
  try {
    if (world === null) {
      throw new Error("The web suite needs a seeded world.");
    }
    log("web: building apps/web");
    const buildMs = await buildWeb(repositoryRoot, stack.server.baseUrl);
    const web = await startWeb(repositoryRoot, stack.server.baseUrl, port);
    const chrome = await launchChrome();
    try {
      await signIn(chrome.browser, web.baseUrl, stack.tenant.cookie);
      const metrics: Record<string, Metric> = {
        build_ms: single("ms", buildMs),
      };
      const loads = new Map<string, PageLoad[]>(
        ROUTES.map((route) => [route.name, []])
      );

      for (const route of ROUTES) {
        await auditPage(chrome.browser, `${web.baseUrl}${route.path(world)}`);
      }
      for (let run = 0; run < settings.runs; run += 1) {
        for (const route of ROUTES) {
          log(`web: ${route.name} run ${run + 1}/${settings.runs}`);
          loads
            .get(route.name)
            ?.push(
              await auditPage(
                chrome.browser,
                `${web.baseUrl}${route.path(world)}`
              )
            );
        }
      }
      for (const route of ROUTES) {
        Object.assign(
          metrics,
          collect(route.name, loads.get(route.name) ?? [], PAGE_METRICS)
        );
      }

      const heaps: HeapReading[] = [];
      for (let run = 0; run < settings.runs; run += 1) {
        log(
          `web: heap after opening the large trial ${run + 1}/${settings.runs}`
        );
        heaps.push(
          await heapAfterOpening(
            chrome.browser,
            `${web.baseUrl}${largeTrialPath(world)}`
          )
        );
      }
      Object.assign(
        metrics,
        collect("trial-large-journal", heaps, HEAP_METRICS)
      );

      return {
        metrics,
        settings: { ...settings, routes: ROUTES.map((route) => route.name) },
        suite: "web",
      };
    } finally {
      await chrome.close();
      await web.stop();
    }
  } finally {
    await stack.teardown();
  }
};
