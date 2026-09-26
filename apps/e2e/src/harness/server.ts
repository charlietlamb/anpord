import { spawn } from "node:child_process";
import { join } from "node:path";
import { portIsFree } from "./ports";
import { AUTH_SECRET } from "./settings";
import { waitUntil } from "./wait";

const READY = "server listening on";
const BOOT_TIMEOUT_MS = 45_000;

export interface RunningServer {
  readonly baseUrl: string;
  /* For a scenario proving something reached the log rather than only the response. */
  readonly output: () => string;
  readonly stop: () => void;
}

/* REDIS_URL is removed rather than blanked: an empty value still reads as a url and sends the server retrying against nothing. */
export const startServer = async (
  repositoryRoot: string,
  databaseUrl: string,
  port: number
): Promise<RunningServer> => {
  if (!(await portIsFree(port))) {
    throw new Error(
      `Port ${port} is already in use, so the e2e server cannot start there. The harness never stops a process it did not start.`
    );
  }

  const { REDIS_URL, ...inherited } = process.env;

  const child = spawn("bun", ["run", "src/server.ts"], {
    cwd: join(repositoryRoot, "apps/server"),
    env: {
      ...inherited,
      AUTH_TRUSTED_ORIGINS: `http://127.0.0.1:${port}`,
      BETTER_AUTH_SECRET: AUTH_SECRET,
      BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
      DATABASE_URL: databaseUrl,
      HOST: "127.0.0.1",
      PORT: String(port),
      /* The server refuses to boot without one; nothing here dispatches a run, so a stand-in satisfies the check without reaching Trigger. */
      TRIGGER_SECRET_KEY: "tr_dev_e2e_no_dispatch",
    },
  });

  let output = "";
  const collect = (chunk: unknown) => {
    output += String(chunk);
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);

  const stop = () => child.kill("SIGKILL");

  try {
    await waitUntil(() => output.includes(READY), {
      describe: "the server starting",
      failed: () =>
        child.exitCode === null
          ? undefined
          : `The server exited while starting:\n${output}`,
      timeoutMs: BOOT_TIMEOUT_MS,
    });
  } catch (cause) {
    stop();
    throw new Error(`${(cause as Error).message}\n${output}`);
  }

  return { baseUrl: `http://127.0.0.1:${port}`, output: () => output, stop };
};
