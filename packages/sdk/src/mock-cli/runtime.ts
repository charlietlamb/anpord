import { Effect } from "effect";
import { appendCall, decodeStandard, errorOf } from "../mock-journal";
import {
  type CliCommandDefinition,
  type CliDefinition,
  optionName,
} from "./define";

const JOURNAL = ".anpord/cli-calls.jsonl";

const commandHelp = (definition: CliDefinition, item: CliCommandDefinition) => {
  const options = Object.entries(item.options).map(
    ([key, option]) =>
      `  ${optionName(key, option)}${option.type === "string" ? " <value>" : ""}${option.description ? `  ${option.description}` : ""}`
  );
  return [
    `Usage: ${definition.path} ${item.path.join(" ")} [options]`,
    item.description,
    options.length
      ? `Options:\n${options.join("\n")}\n  -h, --help`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");
};

const rootHelp = (definition: CliDefinition) =>
  [
    `Usage: ${definition.path} <command> [options]`,
    definition.description,
    `Commands:\n${definition.commands.map(({ description, path }) => `  ${path.join(" ")}${description ? `  ${description}` : ""}`).join("\n")}`,
    "Options:\n  -h, --help\n  -v, --version",
  ]
    .filter(Boolean)
    .join("\n\n");

const selectedCommand = (definition: CliDefinition, args: readonly string[]) =>
  [...definition.commands]
    .sort((left, right) => right.path.length - left.path.length)
    .find(({ path }) => path.every((part, index) => args[index] === part));

const parseOptions = (item: CliCommandDefinition, args: readonly string[]) => {
  const options = new Map<
    string,
    { key: string } & CliCommandDefinition["options"][string]
  >(
    Object.entries(item.options).map(([key, option]) => [
      optionName(key, option),
      { key, ...option },
    ])
  );
  const input: Record<string, string | boolean> = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index] ?? "";
    const separator = token.indexOf("=");
    const name = separator === -1 ? token : token.slice(0, separator);
    const inline = separator === -1 ? undefined : token.slice(separator + 1);
    const option = options.get(name);
    if (option === undefined) {
      throw new Error(`Unknown option: ${token}`);
    }
    if (input[option.key] !== undefined) {
      throw new Error(`Duplicate option: ${name}`);
    }
    if (option.type === "boolean") {
      if (inline !== undefined) {
        throw new Error(`${name} does not take a value`);
      }
      input[option.key] = true;
      continue;
    }
    const value = inline ?? args[index + 1];
    if (value === undefined) {
      throw new Error(`${name} needs a value`);
    }
    input[option.key] = value;
    if (inline === undefined) {
      index += 1;
    }
  }

  return input;
};

export interface CliExecution {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

export const executeCli = (
  definition: CliDefinition,
  args: readonly string[],
  journal = JOURNAL
): Promise<CliExecution> =>
  Effect.gen(function* () {
    if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
      return { exitCode: 0, stderr: "", stdout: `${rootHelp(definition)}\n` };
    }
    if (args[0] === "--version" || args[0] === "-v") {
      return { exitCode: 0, stderr: "", stdout: `${definition.version}\n` };
    }

    const item = selectedCommand(definition, args);
    if (item === undefined) {
      return {
        exitCode: 1,
        stderr: `Unknown command: ${args.join(" ")}\n`,
        stdout: "",
      };
    }

    const rest = args.slice(item.path.length);
    if (rest[0] === "--help" || rest[0] === "-h") {
      return {
        exitCode: 0,
        stderr: "",
        stdout: `${commandHelp(definition, item)}\n`,
      };
    }

    let input: unknown = {};
    const result = yield* Effect.gen(function* () {
      input = yield* Effect.try({
        catch: errorOf,
        try: () => parseOptions(item, rest),
      });
      const decoded = yield* decodeStandard(item.inputSchema, input);
      const output = yield* Effect.tryPromise({
        catch: errorOf,
        try: () =>
          Promise.resolve(
            item.handler(decoded, { signal: new AbortController().signal })
          ),
      }).pipe(
        Effect.flatMap((value) => decodeStandard(item.outputSchema, value))
      );
      yield* appendCall(journal, {
        cli: definition.path,
        command: item.path.join(" "),
        input: decoded,
        output,
      });
      return {
        exitCode: 0,
        stderr: "",
        stdout: `${JSON.stringify(output, null, 2) ?? String(output)}\n`,
      };
    }).pipe(
      Effect.catchAll((cause) =>
        appendCall(journal, {
          cli: definition.path,
          command: item.path.join(" "),
          error: errorOf(cause).message,
          input,
        }).pipe(
          Effect.as({
            exitCode: 1,
            stderr: `${errorOf(cause).message}\n`,
            stdout: "",
          })
        )
      )
    );

    return result;
  }).pipe(Effect.withSpan("CliMock.execute"), Effect.runPromise);

export const runCli = async (definition: CliDefinition, journal?: string) => {
  const result = await executeCli(definition, process.argv.slice(2), journal);
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
};
