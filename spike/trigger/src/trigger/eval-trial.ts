import { task, usage, wait } from "@trigger.dev/sdk";
import { setTimeout as sleep } from "node:timers/promises";

const measured = async (label: string, body: () => Promise<void>) => {
  const startedAt = Date.now();
  const before = await usage.getCurrent();

  await body();

  const after = await usage.getCurrent();

  return {
    label,
    wallMs: Date.now() - startedAt,
    billedMs:
      after.compute.total.durationMs - before.compute.total.durationMs,
  };
};

export const slowPrepare = task({
  id: "slow-prepare",
  run: async (payload: { readonly waitSeconds: number }) => [
    await measured("plain await", () => sleep(payload.waitSeconds * 1000)),
    await measured("wait.for", () =>
      wait.for({ seconds: payload.waitSeconds })
    ),
  ],
});
