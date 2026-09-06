import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { json } from "node:stream/consumers";
import { pathToFileURL } from "node:url";
import type { Prepare, Validator } from "anpord";
import { z } from "zod";

export const prepareSdk: Prepare = async ({ exec }): Promise<undefined> => {
  for (const [file, ...args] of [
    ["npm", "install", "--global", "bun@1.3.14"],
    ["bun", "install", "--frozen-lockfile"],
    ["bun", "run", "--cwd", "packages/sdk", "build"],
  ]) {
    const result = await exec(file, args, { timeoutMs: 600_000 });
    if (result.exitCode !== 0) {
      throw new Error(`${file} ${args.join(" ")} failed: ${result.stderr}`);
    }
  }
  return;
};

const submissionSchema = z.object({
  resolvePrompt: z.function({
    input: [z.string(), z.string(), z.string()],
    output: z.promise(z.string()),
  }),
});
const requestSchema = z.object({ id: z.literal("ci/prompt") });

export const validateSdk: Validator = async () => {
  const nonce = randomUUID();
  let requested = false;
  const server = createServer(async (request, response) => {
    const body = requestSchema.safeParse(await json(request).catch(() => null));
    requested =
      request.method === "POST" &&
      request.url === "/v1/prompts.get" &&
      request.headers.authorization === "Bearer ci-fixture" &&
      body.success;
    response.writeHead(requested ? 200 : 400, {
      "content-type": "application/json",
    });
    response.end(
      JSON.stringify({
        id: "ci/prompt",
        name: "CI",
        content: `Hello {{name}} ${nonce}`,
        config: {},
        version: 1,
        channel: null,
        message: null,
        createdAt: "2026-09-06T00:00:00.000Z",
      })
    );
  });
  await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
  try {
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Mock API did not listen");
    }
    const module = submissionSchema.parse(
      await import(pathToFileURL(resolve("apps/e2e/sdk-smoke.mjs")).href)
    );
    const content = await module.resolvePrompt(
      `http://127.0.0.1:${address.port}`,
      "ci/prompt",
      "CI"
    );
    return {
      passed: requested && content === `Hello CI ${nonce}`,
      message: "Resolve and interpolate a prompt through the PR-built SDK.",
    };
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
};
