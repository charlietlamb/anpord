import { informational, type Metric, type SuiteResult } from "../report/metric";
import { single, summarise } from "../report/stats";
import { DEFAULT_PLAN, type SeedPlan } from "../seed/plan";
import { inRounds, withStacks } from "../stack/paired";
import type { Stack } from "../stack/stack";
import { selectEndpoints } from "./endpoints";
import { type MeasureSettings, measureEndpoint } from "./measure";
import { sampleMemory, stopSamplers } from "./memory";

export interface ServerSettings extends MeasureSettings {
  readonly coldStarts: number;
  readonly endpoints: readonly string[] | null;
  readonly plan: SeedPlan;
}

export const DEFAULT_SERVER_SETTINGS: ServerSettings = {
  coldStarts: 5,
  concurrency: 8,
  endpoints: null,
  plan: DEFAULT_PLAN,
  requests: 300,
  rounds: 5,
  sequential: 50,
  warmup: 20,
};

export const runServerSuite = (
  targets: readonly string[],
  settings: ServerSettings,
  log: (line: string) => void
): Promise<readonly SuiteResult[]> => {
  const selected = selectEndpoints(settings.endpoints);
  log(`server: seeding ${targets.length} scratch database(s)`);
  return withStacks(
    targets,
    { label: "server", plan: settings.plan },
    async (stacks) => {
      const idle = await Promise.all(
        stacks.map((stack) => stack.server.memory())
      );
      const metrics = stacks.map((): Record<string, Metric> => ({}));
      const samplers = stacks.map((stack) => sampleMemory(stack.server.memory));
      try {
        for (const endpoint of selected) {
          const measured = await measureEndpoint(
            stacks,
            endpoint,
            settings,
            log
          );
          for (const [index, each] of measured.entries()) {
            Object.assign(metrics[index] ?? {}, each);
          }
        }
      } catch (cause) {
        await Promise.allSettled(samplers.map((stop) => stop()));
        throw cause;
      }
      for (const [index, peak] of (await stopSamplers(samplers)).entries()) {
        Object.assign(metrics[index] ?? {}, peak);
      }

      log("server: timing cold starts");
      const starts = stacks.map((): number[] => []);
      await inRounds(settings.coldStarts, [...stacks.keys()], async (index) => {
        starts[index]?.push(await (stacks[index] as Stack).coldStart());
      });
      return stacks.map((stack, index) => ({
        metrics: {
          cold_start_ms: summarise("ms", starts[index] ?? []),
          heap_after_seed_bytes: informational(
            single("bytes", idle[index]?.heapUsed ?? 0)
          ),
          rss_after_seed_bytes: informational(
            single("bytes", idle[index]?.rss ?? 0)
          ),
          seed_ms: informational(single("ms", stack.seedMs)),
          ...metrics[index],
        },
        settings: { ...settings },
        suite: "server",
      }));
    }
  );
};
