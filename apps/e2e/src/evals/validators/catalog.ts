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
  console.info("Catalog requests", requests);
  const missing = requests.findIndex(
    ({ id, error }) => id === "missing" && error !== undefined
  );
  const problems = [
    missing < 0 && "No failed request for the missing item.",
    !requests
      .slice(missing + 1)
      .some(({ id, error }) => id === item.id && error === undefined) &&
      "No successful fixture request after the missing item.",
    !answer.includes(item.name) && "The answer does not name the fixture.",
  ].filter(Boolean);
  return {
    passed: problems.length === 0,
    message:
      problems.join(" ") || "Retrieved the fixture after the missing item.",
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
