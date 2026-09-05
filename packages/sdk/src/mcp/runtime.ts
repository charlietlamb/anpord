import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  McpServer,
  type StandardSchemaWithJSON,
} from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { Effect } from "effect";
import type { McpCall } from "./calls";
import type {
  McpServerDefinition,
  ResourceDefinition,
  ToolDefinition,
} from "./define";

const JOURNAL = ".anpord/mcp-calls.jsonl";

const errorOf = (cause: unknown) =>
  cause instanceof Error ? cause : new Error(String(cause));

const decode = <Schema extends StandardSchemaWithJSON>(
  schema: Schema,
  value: StandardSchemaWithJSON.InferInput<Schema>
) =>
  Effect.tryPromise({
    catch: errorOf,
    try: async () => {
      const result = await schema["~standard"].validate(value);

      if (result.issues !== undefined) {
        throw new Error(result.issues.map(({ message }) => message).join("; "));
      }

      return result.value;
    },
  });

const append = (path: string, call: McpCall) =>
  Effect.tryPromise({
    catch: errorOf,
    try: async () => {
      await mkdir(dirname(path), { recursive: true });
      await appendFile(path, `${JSON.stringify(call)}\n`);
    },
  });

const messageOf = (cause: unknown) => errorOf(cause).message;

const toolResult = async (
  definition: ToolDefinition,
  serverName: string,
  journal: string,
  input: unknown,
  signal: AbortSignal
) =>
  Effect.gen(function* () {
    const output = yield* Effect.tryPromise({
      catch: errorOf,
      try: () => Promise.resolve(definition.handler(input, { signal })),
    }).pipe(Effect.flatMap((value) => decode(definition.outputSchema, value)));

    yield* append(journal, {
      input,
      kind: "tool",
      name: definition.name,
      output,
      server: serverName,
    });

    return {
      content: [{ text: JSON.stringify(output), type: "text" as const }],
      structuredContent: output,
    };
  }).pipe(
    Effect.catchAll((cause) =>
      append(journal, {
        error: messageOf(cause),
        input,
        kind: "tool",
        name: definition.name,
        server: serverName,
      }).pipe(
        Effect.as({
          content: [{ text: messageOf(cause), type: "text" as const }],
          isError: true as const,
        })
      )
    ),
    Effect.withSpan("McpMock.tool", {
      attributes: { server: serverName, tool: definition.name },
    }),
    Effect.runPromise
  );

const readResource = async (
  definition: ResourceDefinition,
  serverName: string,
  journal: string,
  uri: URL,
  signal: AbortSignal
) =>
  Effect.gen(function* () {
    const input = { uri: uri.href };
    const output = yield* Effect.tryPromise({
      catch: errorOf,
      try: () => Promise.resolve(definition.handler(input, { signal })),
    }).pipe(Effect.flatMap((value) => decode(definition.outputSchema, value)));

    yield* append(journal, {
      input,
      kind: "resource",
      name: definition.name,
      output,
      server: serverName,
    });

    return {
      contents: [
        {
          mimeType: definition.mimeType ?? "application/json",
          text: typeof output === "string" ? output : JSON.stringify(output),
          uri: uri.href,
        },
      ],
    };
  }).pipe(
    Effect.tapError((cause) =>
      append(journal, {
        error: messageOf(cause),
        input: { uri: uri.href },
        kind: "resource",
        name: definition.name,
        server: serverName,
      })
    ),
    Effect.withSpan("McpMock.resource", {
      attributes: { resource: definition.name, server: serverName },
    }),
    Effect.runPromise
  );

export const createMcpServer = (
  definition: McpServerDefinition,
  journal = JOURNAL
) => {
  const mcp = new McpServer(
    { name: definition.name, version: definition.version },
    { instructions: definition.instructions }
  );

  for (const item of definition.tools) {
    mcp.registerTool(
      item.name,
      {
        annotations: item.annotations,
        description: item.description,
        inputSchema: item.inputSchema,
        outputSchema: item.outputSchema,
        title: item.title,
      },
      (input, context) =>
        toolResult(item, definition.name, journal, input, context.mcpReq.signal)
    );
  }

  for (const item of definition.resources) {
    mcp.registerResource(
      item.name,
      item.uri,
      {
        description: item.description,
        mimeType: item.mimeType,
        title: item.title,
      },
      (uri, context) =>
        readResource(item, definition.name, journal, uri, context.mcpReq.signal)
    );
  }

  return mcp;
};

export const runMcpServer = (definition: McpServerDefinition) =>
  Effect.sync(() =>
    serveStdio(() => createMcpServer(definition), {
      onerror: (error) => console.error(error.message),
    })
  ).pipe(Effect.withSpan("McpMock.serve"), Effect.runSync);
