import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const binary = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../dist/cli.mjs"
);
const built = existsSync(binary);

const run = async (
  args: readonly string[],
  env: Record<string, string> = {}
) => {
  const child = Bun.spawn(["node", binary, ...args], {
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
  test("help names every command, so the surface is discoverable", async () => {
    const { code, stdout } = await run(["--help"]);
    for (const command of ["get", "list", "promote", "push", "versions"]) {
      expect(stdout).toContain(command);
    }
    expect(code).toBe(0);
  });

  test("a failure leaves stdout empty, so output can be redirected", async () => {
    const { code, stderr, stdout } = await run(["list"]);
    expect(stdout).toBe("");
    expect(stderr).toContain("ANPORD_API_KEY");
    expect(code).toBe(1);
  });

  test("a failure reports one line rather than a stack trace", async () => {
    const { stderr } = await run(["list"]);
    expect(stderr.trimEnd().split("\n")).toHaveLength(1);
    expect(stderr).not.toContain("node_modules");
  });

  test("an id that cannot be one is refused before the network", async () => {
    const { code, stdout } = await run(["get", "NOT A VALID ID"], {
      ANPORD_API_KEY: "unused",
      ANPORD_BASE_URL: "http://127.0.0.1:1",
    });
    expect(stdout).toBe("");
    expect(code).toBe(1);
  });
});
