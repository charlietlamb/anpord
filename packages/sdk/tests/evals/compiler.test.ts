import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parse } from "smol-toml";
import { compileEval } from "../../src/evals/compiler";
import { withMcpServers } from "../../src/evals/mcp-profile";

let workspace: string | undefined;

afterEach(async () => {
  if (workspace !== undefined) {
    await rm(workspace, { force: true, recursive: true });
  }
});

describe("compileEval", () => {
  test("strictly decodes existing OpenCode MCP config", () => {
    expect(() =>
      withMcpServers(
        {
          harness: "opencode",
          model: "model",
          profile: {
            env: { OPENCODE_CONFIG_CONTENT: '{"mcp":[]}' },
            files: {},
            name: "profile",
          },
          provider: "e2b",
        },
        [{ entry: "workspace/server.mjs", files: {}, name: "example" }]
      )
    ).toThrow();
  });

  test("adds MCP servers and CLIs to every built-in agent task", async () => {
    workspace = await mkdtemp(join(tmpdir(), "anpord-mcp-eval-"));
    await mkdir(join(workspace, "node_modules"));
    await symlink(
      join(import.meta.dir, "../../node_modules/zod"),
      join(workspace, "node_modules/zod")
    );
    await writeFile(
      join(workspace, "eval.ts"),
      `import { defineEval } from "anpord";
import { cli, command } from "anpord/cli";
import { server, tool } from "anpord/mcp";
import { z } from "zod";
const client = cli({
  name: "example-cli",
  version: "1.0.0",
  commands: [command({
    name: "users get",
    inputSchema: z.object({ id: z.string() }),
    outputSchema: z.object({ id: z.string() }),
    options: { id: { type: "string" } },
    handler: ({ id }) => ({ id }),
  })],
});
const api = server({
  name: "example",
  version: "1.0.0",
  tools: [tool({
    name: "users_get",
    inputSchema: z.object({ id: z.string() }),
    outputSchema: z.object({ id: z.string() }),
    handler: ({ id }) => ({ id }),
  })],
});
export default defineEval({
  cases: [{ name: "case", verify: "true" }],
  cli: [client],
  mcp: [api],
  name: "mcp",
  prompt: "Use the tool",
  source: { kind: "empty" },
  tasks: [
    ...["claude", "codex", "cursor", "fx", "gemini", "opencode", "pi", "qwen"].map(
      (harness) => ({ harness, model: "model", provider: "daytona" })
    ),
  ],
  trials: 1,
});`
    );

    const payload = await compileEval(join(workspace, "eval.ts"));

    for (const task of payload.tasks) {
      expect(task.profile?.name).toBe("anpord-mcp");
      expect(
        task.profile?.files["workspace/.anpord/mcp/0/server.mjs"]
      ).toContain("gunzipSync");
      expect(task.profile?.files["workspace/.anpord/cli/0/cli.mjs"]).toContain(
        "gunzipSync"
      );
      expect(task.profile?.install).toContain(
        'ln -sf "$PWD/.anpord/cli/0/cli.mjs" ~/.local/bin/example-cli'
      );
    }

    const first = payload.tasks[0];
    for (const [path, source] of Object.entries(first?.profile?.files ?? {})) {
      if (path.startsWith("workspace/")) {
        const target = join(workspace, path.slice("workspace/".length));
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, source);
      }
    }
    expect(
      execFileSync(
        "node",
        [".anpord/cli/0/cli.mjs", "users", "get", "--id", "user_1"],
        { cwd: workspace, encoding: "utf8" }
      )
    ).toContain('"id": "user_1"');

    const opencode = payload.tasks.find(
      ({ harness }) => harness === "opencode"
    );
    expect(
      JSON.parse(opencode?.profile?.env?.OPENCODE_CONFIG_CONTENT ?? "")
    ).toEqual({
      mcp: {
        example: {
          command: ["node", ".anpord/mcp/0/server.mjs"],
          enabled: true,
          type: "local",
        },
      },
    });
  });

  test("adds root MCP servers to Codex config", () => {
    const task = withMcpServers(
      {
        harness: "codex",
        model: "gpt-5",
        profile: {
          files: { "home/.codex/config.toml": 'model = "gpt-5"' },
          name: "profile",
        },
        provider: "e2b",
      },
      [{ entry: "workspace/server.mjs", files: {}, name: "example" }]
    );

    expect(parse(task.profile?.files["home/.codex/config.toml"] ?? "")).toEqual(
      {
        model: "gpt-5",
        mcp_servers: {
          example: {
            args: ["server.mjs"],
            command: "node",
            default_tools_approval_mode: "approve",
            required: true,
          },
        },
      }
    );
  });

  test("bundles a directly referenced TypeScript validator", async () => {
    workspace = await mkdtemp(join(tmpdir(), "anpord-validator-"));
    await writeFile(
      join(workspace, "validator.ts"),
      `import type { Validator } from "anpord";
export const hasGreeting: Validator = async ({ readText }) => ({
  message: "result.txt contains hello",
  passed: (await readText("result.txt")).includes("hello"),
});`
    );
    await writeFile(
      join(workspace, "eval.ts"),
      `import { defineEval } from "anpord";
import { hasGreeting } from "./validator";
export default defineEval({
  cases: [{ variables: { task: "Write a greeting" }, name: "greeting", validate: hasGreeting }],
  name: "direct-validator",
  prompt: "{{task}}",
  tasks: [{ harness: "codex", model: "gpt-5", provider: "daytona" }],
  trials: 1,
});`
    );

    const payload = await compileEval(join(workspace, "eval.ts"));
    const validator = payload.cases[0]?.validator;

    expect(payload.name).toBe("direct-validator");
    expect(validator?.name).toBe("hasGreeting");
    expect(validator?.source).not.toContain("direct-validator");
    expect(payload.cases[0]?.verify).toBeNull();

    await writeFile(join(workspace, "result.txt"), "hello from the agent");
    const script = join(workspace, "validator.mjs");
    await writeFile(script, validator?.source ?? "");

    const process = Bun.spawn(["node", script], { cwd: workspace });
    const output = await new Response(process.stdout).text();

    expect(await process.exited).toBe(0);
    expect(output).toContain(
      'ANPORD_VALIDATOR_RESULT={"message":"result.txt contains hello","passed":true}'
    );
  });

  test("resolves the source helpers a definition imports", async () => {
    workspace = await mkdtemp(join(tmpdir(), "anpord-source-"));
    await writeFile(
      join(workspace, "eval.ts"),
      `import { defineEval, empty, repo } from "anpord";
export default defineEval({
  cases: [
    { variables: { task: "add a test" }, name: "inherits", verify: "true" },
    { variables: { task: "from scratch" }, name: "overrides", source: empty, verify: "true" },
  ],
  name: "suite",
  prompt: "{{task}}",
  source: repo("acme/widgets@a1b2c3d"),
  tasks: [{ harness: "codex", model: "gpt-5.6-sol", provider: "daytona" }],
  trials: 1,
});`
    );

    const payload = await compileEval(join(workspace, "eval.ts"));

    expect(payload.cases[0]?.source).toEqual({
      kind: "repo",
      ref: "a1b2c3d",
      url: "https://github.com/acme/widgets.git",
    });
    expect(payload.cases[1]?.source).toEqual({ kind: "empty" });
  });

  test("refuses a repository nobody could read, at the definition", async () => {
    workspace = await mkdtemp(join(tmpdir(), "anpord-bad-source-"));
    await writeFile(
      join(workspace, "eval.ts"),
      `import { defineEval, repo } from "anpord";
export default defineEval({
  cases: [{ variables: { task: "g" }, name: "c", verify: "true" }],
  name: "suite",
  prompt: "{{task}}",
  source: repo("acme"),
  tasks: [{ harness: "codex", model: "gpt-5.6-sol", provider: "daytona" }],
  trials: 1,
});`
    );

    expect(compileEval(join(workspace, "eval.ts"))).rejects.toThrow();
  });

  test("reads a repository named as a plain string", async () => {
    workspace = await mkdtemp(join(tmpdir(), "anpord-bare-"));
    await writeFile(
      join(workspace, "eval.ts"),
      `import { defineEval } from "anpord";
export default defineEval({
  cases: [
    { variables: { task: "add a test" }, name: "inherits", verify: "true" },
    { variables: { task: "fix it" }, name: "own", source: "acme/widgets", verify: "true" },
  ],
  name: "suite",
  prompt: "{{task}}",
  source: "charlietlamb/strudel@main",
  tasks: [{ harness: "codex", model: "gpt-5.6-sol", provider: "daytona" }],
  trials: 1,
});`
    );

    const payload = await compileEval(join(workspace, "eval.ts"));

    expect(payload.cases[0]?.source).toEqual({
      kind: "repo",
      ref: "main",
      url: "https://github.com/charlietlamb/strudel.git",
    });
    expect(payload.cases[1]?.source).toEqual({
      kind: "repo",
      ref: null,
      url: "https://github.com/acme/widgets.git",
    });
  });

  test("refuses a plain string that is not a repository", async () => {
    workspace = await mkdtemp(join(tmpdir(), "anpord-bare-bad-"));
    await writeFile(
      join(workspace, "eval.ts"),
      `import { defineEval } from "anpord";
export default defineEval({
  cases: [{ variables: { task: "g" }, name: "c", verify: "true" }],
  name: "suite",
  prompt: "{{task}}",
  source: "nonsense",
  tasks: [{ harness: "codex", model: "gpt-5.6-sol", provider: "daytona" }],
  trials: 1,
});`
    );

    expect(compileEval(join(workspace, "eval.ts"))).rejects.toThrow();
  });

  test("falls back to the repository the definition sits in", async () => {
    workspace = await mkdtemp(join(tmpdir(), "anpord-local-"));
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: workspace, stdio: "pipe" });

    git("init", "--quiet");
    git("remote", "add", "origin", "https://github.com/acme/widgets.git");

    await writeFile(
      join(workspace, "eval.ts"),
      `import { defineEval } from "anpord";
export default defineEval({
  cases: [{ variables: { task: "add a test" }, name: "c", verify: "true" }],
  name: "suite",
  prompt: "{{task}}",
  tasks: [{ harness: "codex", model: "gpt-5.6-sol", provider: "daytona" }],
  trials: 1,
});`
    );

    const payload = await compileEval(join(workspace, "eval.ts"));

    expect(payload.cases[0]?.source).toEqual({
      kind: "repo",
      ref: null,
      url: "https://github.com/acme/widgets.git",
    });
  });

  test("a named source is not replaced by the surrounding repository", async () => {
    workspace = await mkdtemp(join(tmpdir(), "anpord-named-"));
    await writeFile(
      join(workspace, "eval.ts"),
      `import { defineEval } from "anpord";
export default defineEval({
  cases: [{ variables: { task: "g" }, name: "c", verify: "true" }],
  name: "suite",
  prompt: "{{task}}",
  source: "acme/widgets",
  tasks: [{ harness: "codex", model: "gpt-5.6-sol", provider: "daytona" }],
  trials: 1,
});`
    );

    const payload = await compileEval(join(workspace, "eval.ts"));

    expect(payload.cases[0]?.source).toEqual({
      kind: "repo",
      ref: null,
      url: "https://github.com/acme/widgets.git",
    });
  });

  test("bundles a typed setup beside its validator", async () => {
    workspace = await mkdtemp(join(tmpdir(), "anpord-setup-"));
    await writeFile(
      join(workspace, "prepare.ts"),
      `import type { Validator, Prepare } from "anpord";

export const prepareRepoImage: Prepare = async ({ exec }) => {
  await exec("npm", ["ci", "--workspace", "renderer"]);
  return { rendererPort: 4173 };
};

export const validateRepoImage: Validator = ({ setup }) =>
  setup.rendererPort === 4173;`
    );
    await writeFile(
      join(workspace, "eval.ts"),
      `import { defineEval } from "anpord";
import { prepareRepoImage, validateRepoImage } from "./prepare";

export default defineEval({
  cases: [
    {
      name: "renders",
      prepare: prepareRepoImage,
      validate: validateRepoImage,
      variables: { task: "Render" },
    },
  ],
  name: "suite",
  prompt: "{{task}}",
  tasks: [{ harness: "codex", model: "gpt-5.6-sol", provider: "daytona" }],
  trials: 1,
});`
    );

    const payload = await compileEval(join(workspace, "eval.ts"));
    const subject = payload.cases[0];

    expect(subject?.prepare?.name).toBe("prepareRepoImage");
    expect(subject?.prepare?.source).toContain("--workspace");
    expect(subject?.validator?.name).toBe("validateRepoImage");
  });
});
