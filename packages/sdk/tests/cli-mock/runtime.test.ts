import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { cli, command } from "../../src/mock-cli";
import { executeCli } from "../../src/mock-cli/runtime";

let directory: string | undefined;

afterEach(async () => {
  if (directory !== undefined) {
    await rm(directory, { force: true, recursive: true });
    directory = undefined;
  }
});

const getServer = command({
  name: "servers get",
  description: "Get a server",
  inputSchema: z.object({
    json: z.boolean().default(false),
    serverId: z.string(),
  }),
  outputSchema: z.object({ id: z.string(), name: z.string() }),
  options: {
    json: { type: "boolean" },
    serverId: { description: "Server ID", type: "string" },
  },
  handler: ({ serverId }) => ({ id: serverId, name: "Fixture" }),
});

const fixture = cli({
  name: "mcp-use",
  version: "1.0.0",
  description: "Manage MCP servers",
  commands: [getServer],
});

const execute = async (args: readonly string[]) => {
  directory ??= await mkdtemp(join(tmpdir(), "anpord-cli-"));
  return executeCli(fixture, args, join(directory, "calls.jsonl"));
};

const journal = () => {
  if (directory === undefined) {
    throw new Error("CLI fixture was not executed");
  }
  return join(directory, "calls.jsonl");
};

describe("CLI mocks", () => {
  test("validates, executes, prints, and records a command", async () => {
    const result = await execute([
      "servers",
      "get",
      "--server-id=server_fixture",
      "--json",
    ]);

    expect(result).toEqual({
      exitCode: 0,
      stderr: "",
      stdout: '{\n  "id": "server_fixture",\n  "name": "Fixture"\n}\n',
    });
    expect(JSON.parse(await readFile(journal(), "utf8"))).toEqual({
      cli: "mcp-use",
      command: "servers get",
      input: { json: true, serverId: "server_fixture" },
      output: { id: "server_fixture", name: "Fixture" },
    });
  });

  test("generates discoverable help", async () => {
    expect((await execute([])).stdout).toContain("servers get  Get a server");
    expect((await execute(["--version"])).stdout).toBe("1.0.0\n");
    expect((await execute(["servers", "get", "--help"])).stdout).toContain(
      "--server-id <value>  Server ID"
    );
  });

  test("records invalid input without calling the handler", async () => {
    const result = await execute(["servers", "get", "--json"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("expected string");
    expect(await readFile(journal(), "utf8")).toContain('"error"');
  });

  test("rejects unknown options", async () => {
    const result = await execute(["servers", "get", "--unknown"]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe("Unknown option: --unknown\n");
  });

  test("rejects invalid and duplicate declarations", () => {
    expect(() => cli({ ...fixture, name: "Not Valid" })).toThrow();
    expect(() => cli({ ...fixture, commands: [getServer, getServer] })).toThrow(
      "Duplicate CLI command: servers get"
    );
  });
});
