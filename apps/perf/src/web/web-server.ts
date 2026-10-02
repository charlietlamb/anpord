import { join } from "node:path";
import { runOrThrow } from "@sphynx/e2e/src/harness/process";
import { localUrl, spawnUntilReady } from "../stack/child";

const webEnv = (serverUrl: string, port: number) => ({
  AUTH_SERVER_URL: serverUrl,
  BETTER_AUTH_URL: serverUrl,
  HOST: "127.0.0.1",
  NODE_ENV: "production",
  PORT: String(port),
  VITE_POSTHOG_KEY: "",
});

export const buildWeb = async (repositoryRoot: string, serverUrl: string) => {
  const began = performance.now();
  const { REDIS_URL, ...inherited } = process.env;
  await runOrThrow("Could not build apps/web", "bun", ["run", "build"], {
    cwd: join(repositoryRoot, "apps/web"),
    env: { ...inherited, ...webEnv(serverUrl, 0) },
  });
  return performance.now() - began;
};

export const startWeb = async (
  repositoryRoot: string,
  serverUrl: string,
  port: number
) => {
  const baseUrl = localUrl(port);
  const { stop } = await spawnUntilReady({
    args: [".output/server/index.mjs"],
    command: "node",
    cwd: join(repositoryRoot, "apps/web"),
    env: webEnv(serverUrl, port),
    failure: "The web server did not start",
    ready: (status) => status < 400,
    readyUrl: `${baseUrl}/login`,
    timeoutMs: 30_000,
  });
  return { baseUrl, stop };
};
