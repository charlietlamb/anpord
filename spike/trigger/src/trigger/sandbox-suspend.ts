import { task, usage, wait } from "@trigger.dev/sdk";
import { Daytona } from "@daytonaio/sdk";

const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY });

export const sandboxSuspend = task({
  id: "sandbox-suspend",
  run: async (payload: { readonly sleepSeconds: number }) => {
    const before = await usage.getCurrent();

    const sandbox = await daytona.create({ language: "javascript" });
    const sessionId = `spike-${Date.now()}`;
    await sandbox.process.createSession(sessionId);

    const started = await sandbox.process.executeSessionCommand(sessionId, {
      command: `sleep ${payload.sleepSeconds} && echo DONE_MARKER`,
      runAsync: true,
    });

    const commandId = started.cmdId as string;
    const sandboxId = sandbox.id;

    await wait.for({ seconds: payload.sleepSeconds + 10 });

    const resumed = await daytona.get(sandboxId);
    const finished = await resumed.process.getSessionCommand(sessionId, commandId);
    const logs = await resumed.process.getSessionCommandLogs(sessionId, commandId);

    const after = await usage.getCurrent();
    await resumed.delete();

    return {
      billedMs: after.compute.total.durationMs - before.compute.total.durationMs,
      exitCode: finished.exitCode,
      logShape: typeof logs,
      logSample: JSON.stringify(logs).slice(0, 120),
      survivedSuspension: finished.exitCode === 0,
    };
  },
});
