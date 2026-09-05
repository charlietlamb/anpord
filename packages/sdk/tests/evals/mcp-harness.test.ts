import { describe, expect, test } from "bun:test";
import type { EvalHarness } from "@anpord/schema/domain/evals";
import { Schema } from "effect";
import { parse } from "smol-toml";
import { applyMcpHarness } from "../../src/evals/mcp-harness";

const StdioServer = Schema.Struct({
  args: Schema.Array(Schema.String),
  command: Schema.String,
  trust: Schema.optional(Schema.Boolean),
});
const McpServersConfig = Schema.parseJson(
  Schema.Struct({
    mcpServers: Schema.Record({ key: Schema.String, value: StdioServer }),
  })
);
const McpConfig = Schema.parseJson(
  Schema.Struct({
    mcp: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  })
);
const CodexConfig = Schema.Struct({
  mcp_servers: Schema.Record({
    key: Schema.String,
    value: Schema.Struct({
      args: Schema.Array(Schema.String),
      command: Schema.String,
      default_tools_approval_mode: Schema.String,
      required: Schema.Boolean,
    }),
  }),
});
const servers = [
  { entry: "workspace/.anpord/mcp/0/server.mjs", files: {}, name: "example" },
];
const profile = { files: {}, name: "profile" } as const;

const apply = (harness: EvalHarness) =>
  applyMcpHarness(harness, profile, servers);

describe("MCP harness adapters", () => {
  test.each([
    ["claude", "workspace/.mcp.json", false],
    ["cursor", "workspace/.cursor/mcp.json", false],
    ["gemini", "workspace/.gemini/settings.json", true],
    ["pi", "home/.pi/agent/mcp.json", false],
    ["qwen", "workspace/.qwen/settings.json", true],
  ] as const)("configures %s through strict JSON", (harness, path, trusted) => {
    const configured = apply(harness);
    const config = Schema.decodeUnknownSync(McpServersConfig)(
      configured.files[path]
    );

    expect(config.mcpServers.example).toEqual({
      args: [".anpord/mcp/0/server.mjs"],
      command: "node",
      ...(trusted ? { trust: true } : {}),
    });
    expect(() => applyMcpHarness(harness, configured, servers)).toThrow();
  });

  test("installs Pi's MCP adapter after any consumer install", () => {
    const configured = applyMcpHarness(
      "pi",
      { ...profile, install: "npm install" },
      servers
    );

    expect(configured.install).toBe(
      "npm install && ~/.local/bin/pi install npm:pi-mcp-adapter@2.32.1"
    );
  });

  test("configures FX through its trusted home profile", () => {
    const configured = apply("fx");
    const config = Schema.decodeUnknownSync(McpConfig)(
      configured.files["home/.fx/mcp.json"]
    );

    expect(config.mcp.example).toEqual({
      command: ["node", ".anpord/mcp/0/server.mjs"],
      enabled: true,
      required: true,
      type: "local",
    });
    expect(() => applyMcpHarness("fx", configured, servers)).toThrow();
  });

  test("configures Codex through its home TOML", () => {
    const configured = apply("codex");
    const config = Schema.decodeUnknownSync(CodexConfig)(
      parse(configured.files["home/.codex/config.toml"] ?? "")
    );

    expect(config.mcp_servers?.example).toEqual({
      args: [".anpord/mcp/0/server.mjs"],
      command: "node",
      default_tools_approval_mode: "approve",
      required: true,
    });
    expect(() => applyMcpHarness("codex", configured, servers)).toThrow();
  });

  test("configures OpenCode through its environment", () => {
    const configured = apply("opencode");
    const config = Schema.decodeUnknownSync(McpConfig)(
      configured.env?.OPENCODE_CONFIG_CONTENT
    );

    expect(config.mcp.example).toEqual({
      command: ["node", ".anpord/mcp/0/server.mjs"],
      enabled: true,
      type: "local",
    });
    expect(() => applyMcpHarness("opencode", configured, servers)).toThrow();
  });

  test("leaves custom command harness integration to its author", () => {
    expect(() => apply("command")).toThrow(
      "MCP mock servers are not supported by command"
    );
  });
});
