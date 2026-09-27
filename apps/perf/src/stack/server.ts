import { spawn } from "node:child_process";
import { join } from "node:path";
import { freePort } from "@anpord/e2e/src/harness/ports";
import { sessionCookieHeader } from "@anpord/e2e/src/harness/session-cookie";
import { AUTH_SECRET } from "@anpord/e2e/src/harness/settings";

const BOOT_TIMEOUT_MS = 60_000;
const READY_POLL_MS = 20;
const PROBE_TIMEOUT_MS = 10_000;

interface ServerMemory {
  readonly heapUsed: number;
  readonly rss: number;
}

export interface RunningServer {
  readonly baseUrl: string;
  readonly coldStartMs: number;
  readonly memory: () => Promise<ServerMemory>;
  readonly queries: () => Promise<number>;
  readonly stop: () => Promise<void>;
}

export interface ServerOptions {
  readonly databaseUrl: string;
  readonly repositoryRoot: string;
  readonly trustedOrigins?: readonly string[];
}

const healthy = async (baseUrl: string) => {
  try {
    const response = await fetch(`${baseUrl}/api/healthz`);
    await response.arrayBuffer();
    return response.status === 200;
  } catch {
    return false;
  }
};

const sleep = (millis: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, millis));

export const startServer = async (
  options: ServerOptions
): Promise<RunningServer> => {
  const port = await freePort();
  const probePort = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const probeUrl = `http://127.0.0.1:${probePort}`;
  const { REDIS_URL, ...inherited } = process.env;

  const startedAt = performance.now();
  const child = spawn(
    "bun",
    ["--preload", join(import.meta.dir, "probe-preload.ts"), "src/server.ts"],
    {
      cwd: join(options.repositoryRoot, "apps/server"),
      env: {
        ...inherited,
        AUTH_TRUSTED_ORIGINS: [baseUrl, ...(options.trustedOrigins ?? [])].join(
          ","
        ),
        BETTER_AUTH_SECRET: AUTH_SECRET,
        BETTER_AUTH_URL: baseUrl,
        DATABASE_URL: options.databaseUrl,
        HOST: "127.0.0.1",
        LOG_LEVEL: "Warning",
        PERF_PROBE_PORT: String(probePort),
        PERF_REPOSITORY_ROOT: options.repositoryRoot,
        PORT: String(port),
        TRIGGER_SECRET_KEY: "tr_dev_perf_no_dispatch",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  let output = "";
  const collect = (chunk: unknown) => {
    output = `${output}${String(chunk)}`.slice(-20_000);
  };
  child.stdout?.on("data", collect);
  child.stderr?.on("data", collect);
  const exited = new Promise<void>((resolve) =>
    child.once("exit", () => resolve())
  );

  const running = () => child.exitCode === null && child.signalCode === null;
  const stop = async () => {
    if (running()) {
      child.kill("SIGKILL");
      await exited;
    }
  };

  while (!(await healthy(baseUrl))) {
    if (!running() || performance.now() - startedAt > BOOT_TIMEOUT_MS) {
      await stop();
      throw new Error(`The server did not answer /api/healthz:\n${output}`);
    }
    await sleep(READY_POLL_MS);
  }
  const coldStartMs = performance.now() - startedAt;

  const probe = async <T>(path: string) => {
    const response = await fetch(`${probeUrl}${path}`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(
        `The server probe answered ${path} with ${response.status}.`
      );
    }
    return (await response.json()) as T;
  };

  return {
    baseUrl,
    coldStartMs,
    memory: () => probe<ServerMemory>("/memory"),
    queries: async () => (await probe<{ queries: number }>("/queries")).queries,
    stop,
  };
};

export const sessionCookie = (sessionToken: string) =>
  sessionCookieHeader(sessionToken, AUTH_SECRET);
