import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { z } from "zod";
import { resource, server, tool } from "../../src/mcp/define";
import { createMcpServer } from "../../src/mcp/runtime";

let directory: string | undefined;

afterEach(async () => {
  if (directory !== undefined) {
    await rm(directory, { force: true, recursive: true });
    directory = undefined;
  }
});

const connected = async () => {
  directory = await mkdtemp(join(tmpdir(), "anpord-mcp-"));
  const journal = join(directory, "calls.jsonl");
  const definition = server({
    name: "example",
    resources: [
      resource({
        handler: ({ uri }) => ({ name: "Example", uri }),
        name: "info",
        outputSchema: z.object({ name: z.string(), uri: z.string() }),
        uri: "example://info",
      }),
    ],
    tools: [
      tool({
        handler: ({ id }) => {
          if (id === "missing") {
            throw new Error("not found");
          }
          return { id, name: "Ada" };
        },
        inputSchema: z.object({ id: z.string() }),
        name: "users_get",
        outputSchema: z.object({ id: z.string(), name: z.string() }),
      }),
    ],
    version: "1.0.0",
  });
  const mcp = createMcpServer(definition, journal);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "1.0.0" });

  await mcp.connect(serverTransport);
  await client.connect(clientTransport);

  return { client, journal, mcp };
};

describe("MCP mocks", () => {
  test("serves typed tools and resources and records their calls", async () => {
    const { client, journal, mcp } = await connected();

    expect((await client.listTools()).tools.map(({ name }) => name)).toEqual([
      "users_get",
    ]);

    const result = await client.callTool({
      arguments: { id: "user_1" },
      name: "users_get",
    });
    expect(result.structuredContent).toEqual({ id: "user_1", name: "Ada" });

    const resourceResult = await client.readResource({ uri: "example://info" });
    const content = resourceResult.contents[0];
    expect(
      content !== undefined && "text" in content && content.text
    ).toContain('"name":"Example"');

    const calls = (await readFile(journal, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(calls.map(({ kind, name }) => [kind, name])).toEqual([
      ["tool", "users_get"],
      ["resource", "info"],
    ]);

    await Promise.all([client.close(), mcp.close()]);
  });

  test("returns handler failures as tool errors", async () => {
    const { client, mcp } = await connected();
    const result = await client.callTool({
      arguments: { id: "missing" },
      name: "users_get",
    });

    expect(result.isError).toBe(true);
    expect(result.content).toContainEqual({ text: "not found", type: "text" });

    await Promise.all([client.close(), mcp.close()]);
  });

  test("rejects invalid input before invoking the handler", async () => {
    const { client, journal, mcp } = await connected();

    const result = await client.callTool({
      arguments: { id: 1 },
      name: "users_get",
    });
    expect(result.isError).toBe(true);
    await expect(readFile(journal, "utf8")).rejects.toThrow();

    await Promise.all([client.close(), mcp.close()]);
  });

  test("rejects handler output outside its schema", async () => {
    directory = await mkdtemp(join(tmpdir(), "anpord-mcp-"));
    const definition = server({
      name: "example",
      tools: [
        tool({
          handler: () => ({ id: 1 }) as never,
          inputSchema: z.object({}),
          name: "invalid_output",
          outputSchema: z.object({ id: z.string() }),
        }),
      ],
      version: "1.0.0",
    });
    const mcp = createMcpServer(definition, join(directory, "calls.jsonl"));
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "1.0.0" });
    await mcp.connect(serverTransport);
    await client.connect(clientTransport);

    expect(
      (await client.callTool({ arguments: {}, name: "invalid_output" })).isError
    ).toBe(true);

    await Promise.all([client.close(), mcp.close()]);
  });

  test("rejects duplicate definitions", () => {
    const duplicate = tool({
      handler: () => ({}),
      inputSchema: z.object({}),
      name: "same",
      outputSchema: z.object({}),
    });

    expect(() =>
      server({ name: "example", tools: [duplicate, duplicate], version: "1" })
    ).toThrow("Duplicate MCP tool: same");
  });

  test("uses names every supported harness accepts", () => {
    expect(() => server({ name: "not valid", version: "1" })).toThrow(
      "MCP server names need 1-64 letters, digits, underscores, or hyphens"
    );
  });
});
