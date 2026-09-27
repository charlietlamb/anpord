import { spawn } from "node:child_process";
import { join } from "node:path";
import type { Stack } from "../stack/stack";

export const timeCliRun = (stack: Stack, targetRoot: string, fixture: string) =>
  new Promise<number>((resolve, reject) => {
    const began = performance.now();
    const { OPENAI_API_KEY, ...inherited } = process.env;
    const child = spawn(
      "bun",
      [
        join(targetRoot, "packages/sdk/src/cli/main.ts"),
        "eval",
        fixture,
        "--local",
      ],
      {
        env: {
          ...inherited,
          ANPORD_API_KEY: stack.tenant.apiKey,
          ANPORD_BASE_URL: stack.server.baseUrl,
          ANPORD_BROWSER: "none",
        },
        stdio: ["ignore", "ignore", "pipe"],
      }
    );
    let errors = "";
    child.stderr?.on("data", (chunk) => {
      errors = `${errors}${String(chunk)}`.slice(-4000);
    });
    child.once("exit", (code) =>
      code === 0
        ? resolve(performance.now() - began)
        : reject(
            new Error(`The CLI run of ${fixture} exited ${code}:\n${errors}`)
          )
    );
  });
