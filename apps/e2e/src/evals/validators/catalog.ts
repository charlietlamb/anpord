import type { McpCall, Validator } from "anpord";
import { getItemInput, item } from "../fixtures/catalog";

const validateRetrieval = (
  calls: readonly Pick<McpCall, "input" | "error">[],
  answer: string
) => {
  const requests = calls.map(({ input, error }) => ({
    id: getItemInput.safeParse(input).data?.id,
    error,
  }));
  const missing = requests.findIndex(
    ({ id, error }) => id === "missing" && error !== undefined
  );
  return {
    passed:
      missing >= 0 &&
      requests
        .slice(missing + 1)
        .some(({ id, error }) => id === item.id && error === undefined) &&
      answer.includes(item.name),
    message:
      "Recover from the missing item, retrieve the fixture, and report its name.",
  };
};

export const validateMcp: Validator = async ({ answer, mcp }) =>
  validateRetrieval(
    (await mcp.calls("catalog")).filter(
      ({ kind, name }) => kind === "tool" && name === "items_get"
    ),
    await answer()
  );

export const validateCli: Validator = async ({ answer, cli }) =>
  validateRetrieval(
    (await cli.calls("catalog")).filter(
      ({ command }) => command === "items get"
    ),
    await answer()
  );
