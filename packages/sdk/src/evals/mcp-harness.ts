import type { EvalHarness } from "@anpord/schema/domain/evals";
import { HarnessProfile } from "@anpord/schema/domain/harness-profile";
import { Schema } from "effect";
import { parse, stringify } from "smol-toml";
import type { CompiledMcpServer } from "./mcp-profile";

interface McpHarnessAdapter {
  apply(
    profile: HarnessProfile,
    servers: readonly CompiledMcpServer[]
  ): HarnessProfile;
}

const Entries = Schema.Record({ key: Schema.String, value: Schema.Unknown });
const JsonConfig = Schema.parseJson(
  Schema.Struct(
    {
      mcp: Schema.optional(Entries),
      mcpServers: Schema.optional(Entries),
    },
    Entries
  )
);
const CodexConfig = Schema.Struct(
  { mcp_servers: Schema.optional(Entries) },
  Entries
);

const relativeEntry = ({ entry }: CompiledMcpServer) =>
  entry.slice("workspace/".length);

const addServers = (
  current: Readonly<Record<string, unknown>> | undefined,
  harness: string,
  servers: readonly CompiledMcpServer[],
  configure: (server: CompiledMcpServer) => unknown
) => {
  const configured = { ...current };

  for (const server of servers) {
    if (configured[server.name] !== undefined) {
      throw new Error(
        `${harness} MCP server ${server.name} is already configured`
      );
    }
    configured[server.name] = configure(server);
  }

  return configured;
};

const configureJson = (
  content: string,
  key: "mcp" | "mcpServers",
  harness: string,
  servers: readonly CompiledMcpServer[],
  configure: (server: CompiledMcpServer) => unknown
): string => {
  const config = Schema.decodeUnknownSync(JsonConfig)(content);
  return Schema.encodeSync(JsonConfig)({
    ...config,
    [key]: addServers(config[key], harness, servers, configure),
  });
};

const jsonAdapter = (
  harness: string,
  path: string,
  configure: (server: CompiledMcpServer) => unknown,
  key: "mcp" | "mcpServers" = "mcpServers"
): McpHarnessAdapter => ({
  apply: (profile, servers) => {
    const files = { ...profile.files };
    files[path] = configureJson(
      files[path] ?? "{}",
      key,
      harness,
      servers,
      configure
    );
    return { ...profile, files };
  },
});

const stdio = (server: CompiledMcpServer) => ({
  args: [relativeEntry(server)],
  command: "node",
});

const trustedStdio = (server: CompiledMcpServer) => ({
  ...stdio(server),
  trust: true,
});

const claude = jsonAdapter("Claude", "workspace/.mcp.json", stdio);
const cursor = jsonAdapter("Cursor", "workspace/.cursor/mcp.json", stdio);
const gemini = jsonAdapter(
  "Gemini",
  "workspace/.gemini/settings.json",
  trustedStdio
);
const qwen = jsonAdapter("Qwen", "workspace/.qwen/settings.json", trustedStdio);

const piBase = jsonAdapter("Pi", "home/.pi/agent/mcp.json", stdio);
const pi: McpHarnessAdapter = {
  apply: (profile, servers) => {
    const configured = piBase.apply(profile, servers);
    const install = "~/.local/bin/pi install npm:pi-mcp-adapter@2.32.1";
    return {
      ...configured,
      install: profile.install ? `${profile.install} && ${install}` : install,
    };
  },
};

const fx = jsonAdapter(
  "FX",
  "home/.fx/mcp.json",
  (server) => ({
    command: ["node", relativeEntry(server)],
    enabled: true,
    required: true,
    type: "local",
  }),
  "mcp"
);

const codex: McpHarnessAdapter = {
  apply: (profile, servers) => {
    const path = "home/.codex/config.toml";
    const files = { ...profile.files };
    const config = Schema.decodeUnknownSync(CodexConfig)(
      parse(files[path] ?? "")
    );
    files[path] = stringify({
      ...config,
      mcp_servers: addServers(
        config.mcp_servers,
        "Codex",
        servers,
        (server) => ({
          ...stdio(server),
          default_tools_approval_mode: "approve",
          required: true,
        })
      ),
    });
    return { ...profile, files };
  },
};

const opencode: McpHarnessAdapter = {
  apply: (profile, servers) => {
    const env = { ...profile.env };
    env.OPENCODE_CONFIG_CONTENT = configureJson(
      env.OPENCODE_CONFIG_CONTENT ?? "{}",
      "mcp",
      "OpenCode",
      servers,
      (server) => ({
        command: ["node", relativeEntry(server)],
        enabled: true,
        type: "local",
      })
    );
    return { ...profile, env };
  },
};

const adapters: Record<EvalHarness, McpHarnessAdapter | null> = {
  claude,
  codex,
  command: null,
  cursor,
  fx,
  gemini,
  opencode,
  pi,
  qwen,
};

export const applyMcpHarness = (
  harness: EvalHarness,
  profile: HarnessProfile,
  servers: readonly CompiledMcpServer[]
) => {
  const adapter = adapters[harness];
  if (adapter === null) {
    throw new Error(`MCP mock servers are not supported by ${harness}`);
  }
  return Schema.decodeUnknownSync(HarnessProfile)(
    adapter.apply(profile, servers)
  );
};
