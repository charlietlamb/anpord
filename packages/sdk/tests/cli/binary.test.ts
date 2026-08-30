import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const binary = join(packageRoot, "dist", "cli.mjs");
const built = existsSync(binary);
const CLI_TIMEOUT = 15_000;
const version = JSON.parse(
  readFileSync(join(packageRoot, "package.json"), "utf8")
).version as string;

const run = async (
  args: readonly string[],
  env: Record<string, string> = {},
  cwd = packageRoot
) => {
  const child = Bun.spawn(["node", binary, ...args], {
    cwd,
    env: { ...process.env, ANPORD_API_KEY: "", ...env },
    stderr: "pipe",
    stdout: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  return { code: await child.exited, stderr, stdout };
};

describe.if(built)("the published binary", () => {
  test(
    "help names every command, so the surface is discoverable",
    async () => {
      const { code, stdout } = await run(["--help"]);
      for (const command of [
        "eval",
        "get",
        "list",
        "promote",
        "push",
        "versions",
      ]) {
        expect(stdout).toContain(command);
      }
      expect(stdout).toContain("eval [<file>]");
      expect(code).toBe(0);
    },
    CLI_TIMEOUT
  );

  test("the binary version matches its package", async () => {
    const { code, stdout } = await run(["--version"]);
    expect(stdout).toContain(version);
    expect(code).toBe(0);
  });

  test("eval starts anpord.eval.ts by default", async () => {
    const directory = await mkdtemp(join(tmpdir(), "anpord-cli-"));
    let request: { pathname: string; payload: unknown } | undefined;
    const server = Bun.serve({
      port: 0,
      fetch: async (incoming) => {
        request = {
          pathname: new URL(incoming.url).pathname,
          payload: await incoming.json(),
        };
        return Response.json({ id: "run_cli" });
      },
    });

    try {
      await writeFile(
        join(directory, "anpord.eval.ts"),
        `import { defineEval } from "anpord";
export default defineEval({
  name: "cli",
  source: { kind: "empty" },
  prompt: "{{task}}",
  cases: [{ name: "case", variables: { task: "Do nothing" }, verify: "true" }],
  tasks: [{ harness: "codex", model: "test", provider: "daytona" }],
  trials: 1,
});`
      );

      const { code, stdout } = await run(
        ["eval"],
        {
          ANPORD_API_KEY: "unused",
          ANPORD_BASE_URL: server.url.href.slice(0, -1),
        },
        directory
      );

      expect(code).toBe(0);
      expect(JSON.parse(stdout)).toEqual({ id: "run_cli" });
      expect(request?.pathname).toBe("/v1/evals.start");
      expect(request?.payload).toMatchObject({ trials: 1 });
    } finally {
      server.stop(true);
      await rm(directory, { force: true, recursive: true });
    }
  });

  test(
    "a failure leaves stdout empty, so output can be redirected",
    async () => {
      const { code, stderr, stdout } = await run(["list"]);
      expect(stdout).toBe("");
      expect(stderr).toContain("ANPORD_API_KEY");
      expect(code).toBe(1);
    },
    CLI_TIMEOUT
  );

  test("a failure reports one line rather than a stack trace", async () => {
    const { stderr } = await run(["list"]);
    expect(stderr.trimEnd().split("\n")).toHaveLength(1);
    expect(stderr).not.toContain("node_modules");
  });

  test(
    "an id that cannot be one is refused before the network",
    async () => {
      const { code, stdout } = await run(["get", "NOT A VALID ID"], {
        ANPORD_API_KEY: "unused",
        ANPORD_BASE_URL: "http://127.0.0.1:1",
      });
      expect(stdout).toBe("");
      expect(code).toBe(1);
    },
    CLI_TIMEOUT
  );
});
