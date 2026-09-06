import type { HarnessProfile } from "@anpord/schema/domain/harness-profile";
import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";
import { Effect } from "effect";
import type { McpServerDefinition } from "../mcp/define";
import { bundle } from "./eval-bundle";
import { applyMcpHarness } from "./mcp-harness";
import { packageProgram } from "./program-package";
import { type DefinitionRef, mcpEntry } from "./runner-source";

type EvalTask = PublicStartEvalRequest["tasks"][number];

export interface CompiledMcpServer {
  readonly entry: string;
  readonly files: Readonly<Record<string, string>>;
  readonly name: string;
}

export const compileMcpServers = (
  ref: DefinitionRef,
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
        bundle(mcpEntry(ref, index), ref.entry, { minify: true }).pipe(
          Effect.map(({ source }) => ({
            ...packageProgram(
              `workspace/.anpord/mcp/${index}`,
              "server.mjs",
              source
            ),
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
