import { freePort } from "@anpord/e2e/src/harness/ports";
import type { BrowserContext } from "puppeteer-core";
import {
  informational,
  type Metric,
  type SuiteResult,
  type Unit,
} from "../report/metric";
import { single, summarise } from "../report/stats";
import { DEFAULT_PLAN, type SeedPlan } from "../seed/plan";
import type { SeededWorld } from "../seed/seed";
import { alternating, bootStacks, teardownAll } from "../stack/paired";
import type { Stack } from "../stack/stack";
import { launchChrome, signedInContext } from "./browser";
import { type HeapReading, heapAfterOpening } from "./heap";
import { auditPage, type PageLoad } from "./lighthouse";
import { largeTrialPath, ROUTES } from "./routes";
import { buildWeb, type RunningWeb, startWeb } from "./web-server";

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

interface Lane {
  readonly buildMs: number;
  readonly heaps: HeapReading[];
  readonly loads: Map<string, PageLoad[]>;
  readonly stack: Stack;
  readonly web: RunningWeb;
  readonly world: SeededWorld;
}

const openLanes = async (
  targets: readonly string[],
  stacks: readonly Stack[],
  ports: readonly number[],
  lanes: Lane[],
  log: (line: string) => void
) => {
  for (const [index, target] of targets.entries()) {
    const stack = stacks[index] as Stack;
    if (stack.world === null) {
      throw new Error("The web suite needs a seeded world.");
    }
    log(`web: building apps/web in ${target}`);
    const buildMs = await buildWeb(target, stack.server.baseUrl);
    const web = await startWeb(
      target,
      stack.server.baseUrl,
      ports[index] as number
    );
    lanes.push({
      buildMs,
      heaps: [],
      loads: new Map(ROUTES.map((route) => [route.name, []])),
      stack,
      web,
      world: stack.world,
    });
  }
};

const laneMetrics = (lane: Lane): Record<string, Metric> => ({
  build_ms: informational(single("ms", lane.buildMs)),
  ...Object.assign(
    {},
    ...ROUTES.map((route) =>
      collect(route.name, lane.loads.get(route.name) ?? [], PAGE_METRICS)
    )
  ),
  ...collect("trial-large-journal", lane.heaps, HEAP_METRICS),
});

export const runWebSuite = async (
  targets: readonly string[],
  settings: WebSettings,
  log: (line: string) => void
): Promise<readonly SuiteResult[]> => {
  const ports = await Promise.all(targets.map(() => freePort()));
  log(`web: seeding ${targets.length} scratch database(s)`);
  const stacks = await bootStacks(targets, {
    label: "web",
    plan: settings.plan,
    trustedOrigins: ports.map((port) => `http://127.0.0.1:${port}`),
  });
  const lanes: Lane[] = [];
  try {
    await openLanes(targets, stacks, ports, lanes, log);
    const chrome = await launchChrome();
    try {
      const contexts = new Map<Lane, BrowserContext>();
      for (const lane of lanes) {
        contexts.set(
          lane,
          await signedInContext(
            chrome.browser,
            lane.web.baseUrl,
            lane.stack.tenant.cookie
          )
        );
      }
      const contextOf = (lane: Lane) => contexts.get(lane) as BrowserContext;
      const audit = (lane: Lane, path: string) =>
        auditPage(contextOf(lane), `${lane.web.baseUrl}${path}`);
      for (const lane of lanes) {
        for (const route of ROUTES) {
          await audit(lane, route.path(lane.world));
        }
      }
      for (let run = 0; run < settings.runs; run += 1) {
        for (const route of ROUTES) {
          log(`web: ${route.name} run ${run + 1}/${settings.runs}`);
          for (const lane of alternating(lanes, run)) {
            lane.loads
              .get(route.name)
              ?.push(await audit(lane, route.path(lane.world)));
          }
        }
      }
      for (let run = 0; run < settings.runs; run += 1) {
        log(
          `web: heap after opening the large trial ${run + 1}/${settings.runs}`
        );
        for (const lane of alternating(lanes, run)) {
          lane.heaps.push(
            await heapAfterOpening(
              contextOf(lane),
              `${lane.web.baseUrl}${largeTrialPath(lane.world)}`
            )
          );
        }
      }
    } finally {
      await chrome.close();
    }
    return lanes.map((lane) => ({
      metrics: laneMetrics(lane),
      settings: { ...settings, routes: ROUTES.map((route) => route.name) },
      suite: "web",
    }));
  } finally {
    for (const lane of lanes) {
      await lane.web.stop();
    }
    await teardownAll(stacks);
  }
};
