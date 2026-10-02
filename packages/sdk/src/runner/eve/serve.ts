import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { Client } from "eve/client";

export interface ServeEveOptions {
  readonly cwd: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly port?: number;
  readonly readyTimeoutMs?: number;
}

export interface EveServer {
  readonly close: () => Promise<void>;
  readonly url: string;
}

const READY_TIMEOUT_MS = 120_000;
const HEALTH_POLL_MS = 200;

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });

const exited = (child: ChildProcess) =>
  new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }

    child.once("exit", () => resolve());
  });

const killGroup = (child: ChildProcess) => {
  try {
    process.kill(-(child.pid ?? 0), "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
};

const healthy = async (client: Client) => {
  try {
    await client.health();
    return true;
  } catch {
    return false;
  }
};

const awaitHealth = async (
  client: Client,
  child: ChildProcess,
  timeoutMs: number
) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`eve dev exited with code ${child.exitCode}`);
    }

    if (await healthy(client)) {
      return;
    }

    await sleep(HEALTH_POLL_MS);
  }

  throw new Error(`eve dev did not answer health within ${timeoutMs}ms`);
};

export const serveEve = async ({
  cwd,
  env,
  port,
  readyTimeoutMs = READY_TIMEOUT_MS,
}: ServeEveOptions): Promise<EveServer> => {
  const bin = join(cwd, "node_modules", ".bin", "eve");

  if (!existsSync(bin)) {
    throw new Error(`${bin} not found. Install eve in the agent directory.`);
  }

  const listen = port ?? (await freePort());
  const url = `http://127.0.0.1:${listen}`;
  const child = spawn(
    bin,
    ["dev", "--no-ui", "--logs", "none", "--port", String(listen)],
    {
      cwd,
      detached: true,
      env: { ...process.env, EVE_TELEMETRY_DISABLED: "1", ...env },
      stdio: ["ignore", process.stderr, process.stderr],
    }
  );
  const close = async () => {
    killGroup(child);
    await exited(child);
  };

  try {
    await awaitHealth(new Client({ host: url }), child, readyTimeoutMs);
  } catch (error) {
    await close();
    throw error;
  }

  return { close, url };
};
