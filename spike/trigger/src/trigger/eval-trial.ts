import { task, usage } from "@trigger.dev/sdk";
import { setTimeout as sleep } from "node:timers/promises";

export const slowPrepare = task({
  id: "slow-prepare",
  run: async (payload: { readonly waitSeconds: number }) => {
    const startedAt = Date.now();

    await sleep(payload.waitSeconds * 1000);

    const current = await usage.getCurrent();

    return {
      wallMs: Date.now() - startedAt,
      cpuMs: current.attempt.durationMs,
    };
  },
});
