import type { McpCall } from "../mcp/calls";
import type { CliCall } from "../mock-cli/calls";

/* A validator is bundled into every case it guards, so whatever this module
   imports is copied once per case. Effect's Schema costs roughly 690KB
   minified, which is more than the four shapes below are worth: they are
   small, and two of them read records this SDK wrote itself. */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const invalid = (expected: string, value: unknown): never => {
  throw new Error(`Expected ${expected}, received ${JSON.stringify(value)}`);
};

const optionalString = (value: unknown, field: string) => {
  if (value !== undefined && typeof value !== "string") {
    invalid(`${field} to be a string`, value);
  }
  return value as string | undefined;
};

/** The one shape a validator author writes by hand, so it reports precisely. */
export const decodeResult = (value: unknown) => {
  if (typeof value === "boolean") {
    return { passed: value };
  }
  if (!isRecord(value)) {
    return invalid("a boolean or { passed, message? }", value);
  }
  if (typeof value.passed !== "boolean") {
    return invalid("passed to be a boolean", value);
  }
  const extra = Object.keys(value).filter(
    (key) => key !== "passed" && key !== "message"
  );
  if (extra.length > 0) {
    return invalid(
      `no keys beyond passed and message, saw ${extra.join(", ")}`,
      value
    );
  }
  const message = optionalString(value.message, "message");
  return message === undefined
    ? { passed: value.passed }
    : { message, passed: value.passed };
};

export const decodePrepared = (text: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(text);
  return isRecord(parsed)
    ? parsed
    : invalid("prepared values to be an object", parsed);
};

const line = (text: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(text);
  return isRecord(parsed) ? parsed : invalid("a recorded call object", parsed);
};

/* Written by this SDK's own mock servers rather than by an agent, so the
   fields are checked for shape and left otherwise as they were recorded. */
export const decodeMcpCall = (text: string): McpCall => {
  const value = line(text);
  if (value.kind !== "tool" && value.kind !== "resource") {
    invalid('kind to be "tool" or "resource"', value);
  }
  if (typeof value.name !== "string" || typeof value.server !== "string") {
    invalid("name and server to be strings", value);
  }
  return {
    error: optionalString(value.error, "error"),
    input: value.input,
    kind: value.kind as "resource" | "tool",
    name: value.name as string,
    output: value.output,
    server: value.server as string,
  };
};

export const decodeCliCall = (text: string): CliCall => {
  const value = line(text);
  if (typeof value.cli !== "string" || typeof value.command !== "string") {
    invalid("cli and command to be strings", value);
  }
  return {
    cli: value.cli as string,
    command: value.command as string,
    error: optionalString(value.error, "error"),
    input: value.input,
    output: value.output,
  };
};
