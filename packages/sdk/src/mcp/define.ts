import type {
  StandardSchemaWithJSON,
  ToolAnnotations,
} from "@modelcontextprotocol/server";

type Awaitable<Value> = Value | Promise<Value>;

export interface McpHandlerContext {
  readonly signal: AbortSignal;
}

export interface ToolDefinition<
  Input extends StandardSchemaWithJSON = StandardSchemaWithJSON,
  Output extends StandardSchemaWithJSON = StandardSchemaWithJSON,
> {
  readonly _tag: "Tool";
  readonly annotations?: ToolAnnotations;
  readonly description?: string;
  handler(
    input: StandardSchemaWithJSON.InferOutput<Input>,
    context: McpHandlerContext
  ): Awaitable<StandardSchemaWithJSON.InferInput<Output>>;
  readonly inputSchema: Input;
  readonly name: string;
  readonly outputSchema: Output;
  readonly title?: string;
}

export const tool = <
  Input extends StandardSchemaWithJSON,
  Output extends StandardSchemaWithJSON,
>(
  definition: Omit<ToolDefinition<Input, Output>, "_tag">
): ToolDefinition<Input, Output> => ({ ...definition, _tag: "Tool" });

export interface ResourceDefinition<
  Output extends StandardSchemaWithJSON = StandardSchemaWithJSON,
> {
  readonly _tag: "Resource";
  readonly description?: string;
  handler(
    input: { readonly uri: string },
    context: McpHandlerContext
  ): Awaitable<StandardSchemaWithJSON.InferInput<Output>>;
  readonly mimeType?: string;
  readonly name: string;
  readonly outputSchema: Output;
  readonly title?: string;
  readonly uri: string;
}

export const resource = <Output extends StandardSchemaWithJSON>(
  definition: Omit<ResourceDefinition<Output>, "_tag">
): ResourceDefinition<Output> => ({ ...definition, _tag: "Resource" });

export interface McpServerDefinition {
  readonly _tag: "McpServer";
  readonly instructions?: string;
  readonly name: string;
  readonly resources: readonly ResourceDefinition[];
  readonly tools: readonly ToolDefinition[];
  readonly version: string;
}

interface McpServerOptions {
  readonly instructions?: string;
  readonly name: string;
  readonly resources?: readonly ResourceDefinition[];
  readonly tools?: readonly ToolDefinition[];
  readonly version: string;
}

const unique = (label: string, values: readonly string[]) => {
  const duplicate = values.find(
    (value, index) => values.indexOf(value) !== index
  );

  if (duplicate !== undefined) {
    throw new Error(`Duplicate MCP ${label}: ${duplicate}`);
  }
};

export const server = (definition: McpServerOptions): McpServerDefinition => {
  if (!(definition.name.trim() && definition.version.trim())) {
    throw new Error("MCP servers need a name and version");
  }

  const resources = definition.resources ?? [];
  const tools = definition.tools ?? [];

  unique(
    "tool",
    tools.map(({ name }) => name)
  );
  unique(
    "resource",
    resources.map(({ name }) => name)
  );
  unique(
    "resource URI",
    resources.map(({ uri }) => uri)
  );

  return { ...definition, _tag: "McpServer", resources, tools };
};
