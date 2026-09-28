import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Prepare, Validator } from "anpord";
import { api, endpoint, withApi } from "anpord/api";
import { z } from "zod";

export const prepareSdk: Prepare = async ({ exec }): Promise<undefined> => {
  const result = await exec("bun", ["install"], { timeoutMs: 600_000 });
  if (result.exitCode !== 0) {
    throw new Error(
      `bun install exited ${result.exitCode}: ${result.stderr || result.stdout}`
    );
  }
  return;
};

const submissionSchema = z.object({
  resolvePrompt: z.function({
    input: [z.string(), z.string(), z.string()],
    output: z.promise(z.string()),
  }),
});
const promptSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string(),
  config: z.object({}),
  version: z.number(),
  channel: z.null(),
  message: z.null(),
  createdAt: z.string(),
});

export const validateSdk: Validator = () => {
  const nonce = randomUUID();
  return withApi({
    api: api({
      name: "anpord",
      endpoints: [
        endpoint({
          method: "POST",
          path: "/v1/prompts.get",
          inputSchema: z.object({
            headers: z.object({
              authorization: z.literal("Bearer ci-fixture"),
            }),
            body: z.object({ id: z.literal("ci/prompt") }),
          }),
          responses: { 200: promptSchema },
          handler: () => ({
            status: 200,
            body: {
              id: "ci/prompt",
              name: "CI",
              content: `Hello {{name}} ${nonce}`,
              config: {},
              version: 1,
              channel: null,
              message: null,
              createdAt: "2026-09-06T00:00:00.000Z",
            },
          }),
        }),
      ],
    }),
    run: async ({ url, calls }) => {
      const module = submissionSchema.parse(
        await import(pathToFileURL(resolve("sdk-smoke.mjs")).href)
      );
      const content = await module.resolvePrompt(url, "ci/prompt", "CI");
      const requests = await calls();
      console.info("SDK HTTP requests", requests);
      return {
        passed:
          requests.some(({ status, matched }) => matched && status === 200) &&
          content === `Hello CI ${nonce}`,
        message: "Resolve and interpolate a prompt through the PR-built SDK.",
      };
    },
  });
};
