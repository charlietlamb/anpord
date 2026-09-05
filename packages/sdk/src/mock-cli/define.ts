import type { StandardSchemaV1 } from "@standard-schema/spec";

type Awaitable<Value> = Value | Promise<Value>;
type InputSchema = StandardSchemaV1<unknown, Readonly<Record<string, unknown>>>;
type InputOf<Schema extends InputSchema> = StandardSchemaV1.InferOutput<Schema>;

export interface CliHandlerContext {
  readonly signal: AbortSignal;
}

export interface CliOption {
  readonly description?: string;
  readonly name?: `--${string}`;
  readonly type: "boolean" | "string";
}

export interface CliCommandDefinition<
  Input extends InputSchema = InputSchema,
  Output extends StandardSchemaV1 = StandardSchemaV1,
> {
  readonly _tag: "CliCommand";
  readonly description?: string;
  handler(
    input: InputOf<Input>,
    context: CliHandlerContext
  ): Awaitable<StandardSchemaV1.InferInput<Output>>;
  readonly inputSchema: Input;
  readonly name: string;
  readonly options: {
    readonly [Key in Extract<keyof InputOf<Input>, string>]: CliOption;
  };
  readonly outputSchema: Output;
}

type CliCommandOptions<
  Input extends InputSchema,
  Output extends StandardSchemaV1,
> = Omit<CliCommandDefinition<Input, Output>, "_tag" | "options"> & {
  readonly options: {
    readonly [Key in Extract<keyof InputOf<Input>, string>]: Omit<
      CliOption,
      "type"
    > & {
      readonly type: NonNullable<InputOf<Input>[Key]> extends boolean
        ? "boolean"
        : "string";
    };
  };
};

export const command = <
  Input extends InputSchema,
  Output extends StandardSchemaV1,
>(
  definition: CliCommandOptions<Input, Output>
): CliCommandDefinition<Input, Output> => ({
  ...definition,
  _tag: "CliCommand",
});

export interface CliDefinition {
  readonly _tag: "Cli";
  readonly commands: readonly CliCommandDefinition[];
  readonly description?: string;
  readonly name: string;
  readonly version: string;
}

type CliOptions = Omit<CliDefinition, "_tag">;

const NAME = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const COMMAND = /^[a-z0-9][a-z0-9-]*(?: [a-z0-9][a-z0-9-]*)*$/;
const OPTION = /^--[a-z0-9][a-z0-9-]*$/;

export const optionName = (key: string, option: CliOption) =>
  option.name ??
  `--${key.replaceAll(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;

const duplicateOf = (values: readonly string[]) =>
  values.find((value, index) => values.indexOf(value) !== index);

export const cli = (definition: CliOptions): CliDefinition => {
  if (!NAME.test(definition.name)) {
    throw new Error(
      "CLI names need 1-64 lowercase letters, digits, underscores, or hyphens"
    );
  }
  if (!definition.version.trim()) {
    throw new Error("CLIs need a version");
  }

  for (const item of definition.commands) {
    if (!COMMAND.test(item.name)) {
      throw new Error(`Invalid CLI command: ${item.name}`);
    }
    const options = Object.entries(item.options).map(([key, value]) =>
      optionName(key, value)
    );
    const invalid = options.find((name) => !OPTION.test(name));
    if (invalid !== undefined) {
      throw new Error(`Invalid CLI option: ${invalid}`);
    }
    const duplicate = duplicateOf(options);
    if (duplicate !== undefined) {
      throw new Error(`Duplicate CLI option: ${duplicate}`);
    }
  }

  const duplicate = duplicateOf(definition.commands.map(({ name }) => name));
  if (duplicate !== undefined) {
    throw new Error(`Duplicate CLI command: ${duplicate}`);
  }

  return { ...definition, _tag: "Cli" };
};
