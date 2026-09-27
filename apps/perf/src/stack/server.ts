import { join } from "node:path";
import { freePort } from "@anpord/e2e/src/harness/ports";
import { AUTH_SECRET } from "@anpord/e2e/src/harness/settings";
import { localUrl, spawnUntilReady } from "./child";

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

export const startServer = async (
  repositoryRoot: string,
  databaseUrl: string,
  trustedOrigins: readonly string[] = []
): Promise<RunningServer> => {
  const port = await freePort();
  const probePort = await freePort();
  const baseUrl = localUrl(port);
  const probeUrl = localUrl(probePort);
  const { readyMs, stop } = await spawnUntilReady({
    args: [
      "--preload",
      join(import.meta.dir, "probe-preload.ts"),
      "src/server.ts",
    ],
    command: "bun",
    cwd: join(repositoryRoot, "apps/server"),
    env: {
      AUTH_TRUSTED_ORIGINS: [baseUrl, ...trustedOrigins].join(","),
      BETTER_AUTH_SECRET: AUTH_SECRET,
      BETTER_AUTH_URL: baseUrl,
      DATABASE_URL: databaseUrl,
      HOST: "127.0.0.1",
      LOG_LEVEL: "Warning",
      PERF_PROBE_PORT: String(probePort),
      PERF_REPOSITORY_ROOT: repositoryRoot,
      PORT: String(port),
      TRIGGER_SECRET_KEY: "tr_dev_perf_no_dispatch",
    },
    failure: "The server did not answer /api/healthz",
    ready: (status) => status === 200,
    readyUrl: `${baseUrl}/api/healthz`,
    timeoutMs: 60_000,
  });

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
    coldStartMs: readyMs,
    memory: () => probe<ServerMemory>("/memory"),
    queries: async () => (await probe<{ queries: number }>("/queries")).queries,
    stop,
  };
};
