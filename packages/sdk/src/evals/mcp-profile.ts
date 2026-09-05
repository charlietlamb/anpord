import { gzipSync } from "node:zlib";
import type { HarnessProfile } from "@anpord/schema/domain/harness-profile";
import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";
import { Effect } from "effect";
import type { McpServerDefinition } from "../mcp/define";
import { bundle } from "./eval-bundle";
import { applyMcpHarness } from "./mcp-harness";
import { mcpEntry } from "./runner-source";

type EvalTask = PublicStartEvalRequest["tasks"][number];

export interface CompiledMcpServer {
  readonly entry: string;
  readonly files: Readonly<Record<string, string>>;
  readonly name: string;
}

const CHUNK_SIZE = 90_000;
const packaged = (index: number, source: string) => {
  const root = `workspace/.anpord/mcp/${index}`;
  const archive = gzipSync(source).toString("base64");
  const chunks = Array.from(
    { length: Math.ceil(archive.length / CHUNK_SIZE) },
    (_, part) => archive.slice(part * CHUNK_SIZE, (part + 1) * CHUNK_SIZE)
  );
  const names = chunks.map((_, part) => `${part}.txt`);
  const loader = `import{readFile,writeFile}from"node:fs/promises";import{gunzipSync}from"node:zlib";const root=new URL("./",import.meta.url),names=${JSON.stringify(names)},data=(await Promise.all(names.map(name=>readFile(new URL(name,root),"utf8")))).join(""),runtime=new URL("runtime.mjs",root);await writeFile(runtime,gunzipSync(Buffer.from(data,"base64")));await import(runtime.href);`;

  return {
    entry: `${root}/server.mjs`,
    files: Object.fromEntries([
      [`${root}/server.mjs`, loader],
      ...names.map((name, part) => [`${root}/${name}`, chunks[part]]),
    ]),
  };
};

export const compileMcpServers = (
  entry: string,
  definitions: readonly McpServerDefinition[]
) =>
  Effect.gen(function* () {
    const names = definitions.map(({ name }) => name);
    const duplicate = names.find(
      (name, index) => names.indexOf(name) !== index
    );

    if (duplicate !== undefined) {
      return yield* Effect.fail(
        new Error(`Duplicate MCP server: ${duplicate}`)
      );
    }

    return yield* Effect.forEach(
      definitions,
      (definition, index) =>
        bundle(mcpEntry(entry, index), entry, { minify: true }).pipe(
          Effect.map(({ source }) => ({
            ...packaged(index, source),
            name: definition.name,
          }))
        ),
      { concurrency: 4 }
    );
  });

export const withMcpServers = (
  task: EvalTask,
  servers: readonly CompiledMcpServer[]
): EvalTask => {
  if (servers.length === 0) {
    return task;
  }

  const profile: HarnessProfile = task.profile ?? {
    files: {},
    name: "anpord-mcp",
  };
  const files = { ...profile.files };

  for (const item of servers) {
    for (const [path, source] of Object.entries(item.files)) {
      if (files[path] !== undefined) {
        throw new Error(`Profile file ${path} is reserved for MCP mocks`);
      }
      files[path] = source;
    }
  }

  return {
    ...task,
    profile: applyMcpHarness(task.harness, { ...profile, files }, servers),
  };
};
