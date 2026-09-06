import type { Validator } from "anpord";
import { getItemInput, item } from "../fixtures/catalog";

export const validateMcp: Validator = async ({ answer, mcp }) => {
  const calls = await mcp.calls("catalog");
  const retrieved = calls.some(
    ({ kind, name, input, error }) =>
      kind === "tool" &&
      name === "items_get" &&
      getItemInput.safeParse(input).data?.id === item.id &&
      error === undefined
  );
  const recovered = calls.some(
    ({ input, error }) =>
      getItemInput.safeParse(input).data?.id === "missing" &&
      error !== undefined
  );
  return {
    passed: retrieved && recovered && (await answer()).includes(item.name),
    message: "Use the MCP tool and recover from the missing item.",
  };
};

export const validateCli: Validator = async ({ answer, cli }) => {
  const calls = await cli.calls("catalog");
  const retrieved = calls.some(
    ({ command, input, error }) =>
      command === "items get" &&
      getItemInput.safeParse(input).data?.id === item.id &&
      error === undefined
  );
  const recovered = calls.some(
    ({ input, error }) =>
      getItemInput.safeParse(input).data?.id === "missing" &&
      error !== undefined
  );
  return {
    passed: retrieved && recovered && (await answer()).includes(item.name),
    message: "Use the CLI command and recover from the missing item.",
  };
};
